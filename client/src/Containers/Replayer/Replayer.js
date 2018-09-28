import React, { Component } from 'react';
import WorkspaceLayout from '../../Layout/Room/Workspace/Workspace';
import { connect } from 'react-redux';
import * as actions from '../../store/actions/';
import DesmosReplayer from './DesmosReplayer';
import GgbReplayer from './GgbReplayer';
import ChatReplayer from './ChatReplayer';
import ReplayControls from '../../Components/Replayer/Replayer';
import moment from 'moment';
const MAX_WAIT = 10000; // 10 seconds
const BREAK_DURATION = 2000;
const PLAYBACK_FIDELITY = 50;
class Replayer extends Component {

  state = {
    playing: false,
    logIndex: 0,
    constructionLogIndex: 0,
    timeElapsed: 0, // MS
    absTimeElapsed: 0,
    currentMembers: [],
    startTime: '',
  }

  log = this.props.room.events
    .concat(this.props.room.chat)
    .sort((a, b) => a.timestamp - b.timestamp);
  endTime = moment
    .unix(this.log[this.log.length - 1].timestamp / 1000)
    .format('MM/DD/YYYY h:mm:ss A');
  blocks = [];
  blockStart = {
    unix: this.log[0].timestamp,
    time: moment.unix(this.log[0].timestamp / 1000).format('MM/DD/YYYY h:mm:ss A'),
    logIndex: 0
  };

  updatedLog = []
  // displayDuration = this.log.
  relativeDuration = this.log.reduce((acc, cur, idx, src) => {
    // Copy currentEvent
    let event = {...cur};
    // Add the relative Time
    event.relTime = acc;
    this.updatedLog.push(event)
    // calculate the next time
    if (src[idx + 1]) {
      let diff = src[idx + 1].timestamp - cur.timestamp
      if ( diff < MAX_WAIT) {
        return acc += diff;
      } else {
        this.updatedLog.push({
          synthetic: true,
          message: `No activity...skipping ahead to ${moment.unix(src[idx + 1].timestamp/1000).format('MM/DD/YYYY h:mm:ss A')}`,
          relTime: acc += BREAK_DURATION,
        })
        return acc += BREAK_DURATION;
      }
    } else return acc;
  }, 0)
  constructionLog = this.updatedLog.filter(entry => !entry.text && !entry.message)

  componentDidMount() {
    console.log(this.constructionLog)
    const updatedMembers = [...this.state.currentMembers];
    if (this.log[0].autogenerated) {
      // DONT NEED TO CHECK IF THEYRE ENTERING OR EXITING, BECAUSE ITS THE FIRST EVENT THEY MUST
      // BE ENTERING
      updatedMembers.push(this.log[0].user);
    }
    this.setState({
      startTime: moment
        .unix(this.log[0].timestamp / 1000)
        .format('MM/DD/YYYY h:mm:ss A'),
      currentMembers: updatedMembers
    })
  }


  componentDidUpdate(prevProps, prevState){
    if (!prevState.playing && this.state.playing && this.state.logIndex < this.updatedLog.length) {
      this.playing();
    }
  }

  playing = () => {
    this.interval = setInterval(() => {
      let timeElapsed = this.state.timeElapsed;
      let logIndex = this.state.logIndex;
      let constructionLogIndex = this.state.constructionLogIndex;
      let currentMembers = [...this.state.currentMembers]
      let startTime = this.state.startTime
      let absTimeElapsed = this.state.absTimeElapsed;
      timeElapsed += PLAYBACK_FIDELITY
      absTimeElapsed += PLAYBACK_FIDELITY
      //@TODO GET CURRENT MEMBERS
      const nextEvent = this.updatedLog[this.state.logIndex + 1];
      if (!nextEvent) {
        this.setState({playing: false})
        return clearTimeout(this.interval)
      }
      if (timeElapsed >= nextEvent.relTime) {
        logIndex++
        if (nextEvent.event) constructionLogIndex++
        if (nextEvent.autogenerated) {
          if (nextEvent.text.includes('joined')) {
           currentMembers.push(nextEvent.user)
          }
          else {currentMembers = currentMembers.filter(user => user._id !== nextEvent.user._id)}
        }
        if (this.updatedLog[this.state.logIndex].synthetic) {
          startTime = moment(nextEvent.timestamp).format('MM/DD/YYYY h:mm:ss A');
          absTimeElapsed = 0;
        }
      }
      this.setState(prevState => ({
        logIndex, constructionLogIndex,
        timeElapsed, currentMembers,
        startTime, absTimeElapsed,
      }))
    }, PLAYBACK_FIDELITY)
  }

  pausePlay = () => {
    if (this.state.playing) {
      console.log('clearing interval')
      clearInterval(this.interval)
    }
    this.setState(prevState => ({
      playing: !prevState.playing
    }))
  }

  goToTime = (percent) => {
    const timeElapsed = percent  * this.relativeDuration
    console.log('timeElapsed: ', timeElapsed)
    let logIndex;
    let updatedLog = [...this.updatedLog]
    updatedLog.some((entry, i) => {
      if (entry.relTime < timeElapsed) {
        logIndex = i;
        console.log(logIndex)
        return true;
      } return false;
    })
    let constructionLogIndex;
    let constructionLog = [...this.constructionLog];
    constructionLog.some((entry, i ) => {
      if (entry.relTime > timeElapsed) {
        constructionLogIndex = i === 0 ? 0 : i - 1;
        console.log("conIndx: ", constructionLogIndex)
        return true;
      } return false;
    })
    this.setState({timeElapsed, logIndex, constructionLogIndex})
  }

  render() {
    const { room } = this.props
    const event = this.log[this.state.logIndex] || {};
    return (
      <WorkspaceLayout
        activeMember = {event.user}
        members = {this.state.currentMembers}
        graph = {room.roomType === 'geogebra' ?
          // I dont like that these 👇 need to be wrapped in functions could do
          // props.children but I like naming them. Wait is this dumb? we could just pass
          // event to workspaceLayout and then import the graphs there...I did kind of like
          // that a container is importing the containers....I dunno
          () => <GgbReplayer event={event} log={this.constructionLog} index={this.state.constructionLogIndex}/> :
          () => <DesmosReplayer event={event} log={this.constructionLog} index={this.state.constructionLogIndex}/>}
        chat = {() => <ChatReplayer event={event} />}
        // chat={() => <div>chat</div>}
        replayer={() =>
          (<ReplayControls
            playing={this.state.playing}
            pausePlay={this.pausePlay}
            displayDuration={this.relativeDuration}
            blocks={this.blocks}
            startTime={this.state.startTime}
            absTimeElapsed={this.state.absTimeElapsed}
            goToTime={(percent) => this.goToTime(percent)}
            // event={event}
            relTime={this.state.timeElapsed}
            index={this.state.logIndex}
            log={this.updatedLog}
            endTime={this.endTime}
           />)
        }
      />
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    room: state.rooms.byId[ownProps.match.params.room_id],
    user: state.user,
    loading: state.loading.loading,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    updateRoom: (roomId, body) => dispatch(actions.updateRoom(roomId, body)),
  }
}



export default connect(mapStateToProps, mapDispatchToProps)(Replayer);
