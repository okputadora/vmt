import React, { Component } from 'react';
import classes from './graph.css';
import Aux from '../../Components/HOC/Auxil';
import Modal from '../../Components/UI/Modal/Modal';
import Script from 'react-load-script';
import throttle from 'lodash/throttle';
import { parseString } from 'xml2js';
// import { eventNames } from 'cluster';

const THROTTLE_FIDELITY = 60;
class GgbGraph extends Component {

  state = {
    receivingData: false,
    loadingWorkspace: true,
    loading: true,
    selectedElement: '',
    showControlWarning: false,
    warningPosition: {x: 0, y: 0}
  }
  
  graph = React.createRef()
  
  componentDidMount() {
    this.socket = this.props.socket;
    window.addEventListener("resize", throttle(this.updateDimensions, 700));
    this.socket.on('RECEIVE_EVENT', data => {
      this.setState({receivingData: true}, () => {
        switch (data.eventType) {
          case 'ADD':
          if (data.definition) {
            this.ggbApplet.evalCommand(`${data.label}:${data.definition}`)
          }
          this.ggbApplet.evalXML(data.event)
          this.ggbApplet.evalCommand('UpdateConstruction()')
          break;
          case 'REMOVE':
          this.ggbApplet.deleteObject(data.label)
          break;
          case 'UPDATE':
          this.ggbApplet.evalXML(data.event)
          this.ggbApplet.evalCommand('UpdateConstruction()')
          break;
          default: break;
        }
      })
    })
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.inControl && this.props.inControl) {
      this.ggbApplet.showToolBar('0 39 73 62')
      this.ggbApplet.setMode(0)
    }
    else if (prevProps.inControl && !this.props.inControl) {
      this.ggbApplet.showToolBar('')
      this.ggbApplet.setMode(40)
    }
  }
  
  updateDimensions = () => {
    console.log('recaluclating')
    let { clientHeight, clientWidth } = this.graph.current.parentElement;
    window.ggbApplet.setSize(clientWidth, clientHeight);
    // window.ggbApplet.evalCommand('UpdateConstruction()')
    
  }
  
  onScriptLoad = () => {
    // NOTE: complete list here: https://wiki.geogebra.org/en/Reference:GeoGebra_App_Parameters
    const parameters = {
      "id":"ggbApplet",
      // "width": , // 75% width of container
      // "height": "100%",
      "scaleContainerClasse": "graph",
      "customToolBar": "0 39 73 62 | 1 501 67 , 5 19 , 72 75 76 | 2 15 45 , 18 65 , 7 37 | 4 3 8 9 , 13 44 , 58 , 47 | 16 51 64 , 70 | 10 34 53 11 , 24  20 22 , 21 23 | 55 56 57 , 12 | 36 46 , 38 49  50 , 71  14  68 | 30 29 54 32 31 33 | 25 17 26 60 52 61 | 40 41 42 , 27 28 35 , 6",
      "showToolBar": false,
      "showMenuBar": false,
      "showAlgebraInput":true,
      "language": "en",
      "useBrowserForJS":false,
      "borderColor": "#ddd",
      "buttonShadows": true,
      "preventFocus":true,
      // "appName":"whiteboard"
      "appletOnLoad": this.initializeGgb
    };
    
    const ggbApp = new window.GGBApplet(parameters, '5.0');
    ggbApp.inject('ggb-element')
  }
  
  componentWillUnmount() {
    if (this.ggbApplet && this.ggbApplet.listeners) {
      delete window.ggbApplet;
      this.ggbApplet.unregisterAddListener(this.addListener);
      this.ggbApplet.unregisterUpdateListener();
      this.ggbApplet.unregisterRemoveListener(this.eventListener);
      // this.ggbApplet.unregisterClearListener(this.clearListener);
      // this.ggbApplet.unregisterStoreUndoListener(this.undoListener);
    }
    if (!this.props.tempRoom) {
      let canvas = document.querySelector('[aria-label="Graphics View 1"]');
      this.props.updateRoom(this.props.room._id, {graphImage: {imageData: canvas.toDataURL()}})
    }
    window.removeEventListener("resize", this.updateDimensions);
  }
  
  initializeGgb = () => {
    this.ggbApplet = window.ggbApplet;
    this.setState({loading: false})
    this.ggbApplet.setMode(40)
    this.ggbApplet.setFixed('0', true, false)
    let { user, room } = this.props;
    let { events } = room;
    if (events.length > 0) {
      this.ggbApplet.setXML(room.currentState)
    }
    this.addListener = label => {
      // If the user has deleted our control cover div we still need to prevent them from chaning the construction
      // @TODO DONT KNOW IF WE NEED THIS ONLY POSSIBLE IF THE USER HAS HACKED THE FRONT END
      if (!this.props.inControl) {
        this.showControlWarning({screenX: 500, screenY: 500})
        return this.ggbApplet.undo() 
      }
      
      if (!this.state.receivingData) {
        let xml = this.ggbApplet.getXML(label)
        let definition = this.ggbApplet.getCommandString(label);
        sendEvent(xml, definition, label, "ADD", "added");
      }
      this.setState({receivingData: false})
    }
    
    this.removeListener = label => {
      if (!this.props.inControl) {
        return this.ggbApplet.undo() 
      }
      if (!this.state.receivingData) {
        sendEvent(null, null, label, "REMOVE", "removed")
      }
      this.setState({receivingData: false})
    }
    
    this.updateListener = throttle(label => {
      if (!this.props.inControl) {
        return this.ggbApplet.undo() 
      }
      if (!this.state.receivingData) {
        let xml = this.ggbApplet.getXML(label)
        sendEvent(xml, null, label, "UPDATE", "updated")
      }
      this.setState({receivingData: false})
      // this.ggbApplet.evalCommand("updateConstruction()")
    }, THROTTLE_FIDELITY)
    
    const sendEvent = async (xml, definition, label, eventType, action) => {
      let xmlObj;
      if (xml) xmlObj = await parseXML(xml)
      let newData = {
        definition,
        label,
        eventType,
        room: room._id,
        event: xml,
        description: `${user.username} ${action} ${xmlObj && xmlObj.element ? xmlObj.element.$.type : ''} ${label}`,
        user: {_id: user._id, username: user.username},
        timestamp: new Date().getTime(),
        currentState: this.ggbApplet.getXML(),
      }
      this.socket.emit('SEND_EVENT', newData)
      this.props.resetControlTimer()
    }
    // attach this listeners to the ggbApplet
    if (this.ggbApplet.listeners.length === 0) {
      this.ggbApplet.registerAddListener(this.addListener);
      this.ggbApplet.registerClickListener(this.clickListener);
      this.ggbApplet.registerUpdateListener(this.updateListener);
      this.ggbApplet.registerRemoveListener(this.removeListener);

    }
    
    const parseXML = (xml) => {
      return new Promise((resolve, reject) => {
        parseString(xml, (err, result) => {
          if (err) return reject(err)
          return resolve(result)
        })
      })
    }
  }

  // I DONT KNOW IF WE NEED THIS IT ONLY HAPPENS IF THE USER HACKS THIS
  showControlWarning = (event) => {
    console.log('setting state')
    // console.log(event.screenX)
    this.setState({
      showControlWarning: true,
      warningPosition: {x: event.screenX - 100, y: event.screenY - 100}
    }, () => {
      setTimeout(() => {this.setState({showControlWarning: false})}, 1000)
    })
  }

  render() {
    return (
      <Aux>
        <Script url='https://cdn.geogebra.org/apps/deployggb.js' onLoad={this.onScriptLoad} />
        <div className={classes.Graph} id='ggb-element' ref={this.graph}> </div>
        {this.state.showControlWarning ? <div className={classes.ControlWarning} style={{left: this.state.warningPosition.x, top: this.state.warningPosition.y}}>
          You don't have control!
        </div> : null}
        <Modal show={this.state.loading} message='Loading...'/>
      </Aux>
    )
  }
}

export default GgbGraph;
