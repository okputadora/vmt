import React, { Component } from 'react';
// import TextInput from '../Form/TextInput/TextInput';
import classes from './chat.css';
// import Button from '../UI/Button/Button';
import SendIcon from './sendicon';
import moment from 'moment';
class Chat extends Component {

  chatEnd = React.createRef()
  
  componentDidMount() {
    window.addEventListener('keypress', this.onKeyPress)
    this.scrollToBottom();
  }
  componentDidUpdate(prevProps){
    this.scrollToBottom();
  }
  
  componentDidUnmount() {
    window.removeEventListener('keypress', this.onKeyPress)
  }

  onKeyPress = (event) => {
    if (event.key === 'Enter') {
      this.props.submit();
    }
  }

  scrollToBottom = () => {
    this.chatEnd.current.scrollTop = this.chatEnd.current.scrollHeight;
    // window.scroll({top: this.containerRef.current.offsetTop - 100, left: 0, behavior: 'smooth'})
  }
  
  render() {
    const {messages, replayer, change, submit, value} = this.props;
    let displayMessages = [];
    if (messages) {
      displayMessages = messages.map((message, i) => (
        <div key={i} className={classes.Entry}>
          <div><b>{message.autogenerated ? 'VMTbot': message.user.username}: </b><span>{message.text}</span></div>
          {/* CONSIDER CONDITIONALLLY FORMATIING THE DATE BASED ON HOW FAR IN THE PAST IT IS
          IF IT WAS LAST WEEK, SAYING THE DAY AND TIME IS MISLEADING */}
          <div className={classes.Timestamp}>
            {moment.unix(message.timestamp/1000).format('ddd h:mm:ss a')}
          </div>
        </div>
      ))
      // use this to scroll to the bottom
      // displayMessages.push(<div key='end' ref={this.chatEnd}></div>)
    }
    return (
      <div className={classes.Container}>
        <h3 className={classes.Title}>Chat</h3>
        <div className={classes.ChatScroll} ref={this.chatEnd} id='scrollable'>{displayMessages}</div>
        {!replayer ?
          <div className={classes.ChatInput}>
            <input className={classes.Input} type = {"text"} onChange={change} value={value}/>
            {/* <TextInput width={"90%"} size={20} light autoComplete="off" change={change} type='text' name='message' value={value}/> */}
            <div className={classes.Send} onClick={submit}>
              <SendIcon height='24' width='24' viewBox='0 0 24 24'/>
              </div>
          </div> : null
        }
      </div>
    )
  }
}

export default Chat;
