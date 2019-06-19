import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classes from './workspace.css';

class WorkspaceLayout extends Component {
  Graph = React.createRef();

  componentDidUpdate(prevProps) {
    const { isFullscreen } = this.props;
    if (isFullscreen && !prevProps.isFullscreen) {
      this.Graph.current.requestFullscreen();
    }
  }

  render() {
    const {
      chat,
      tabs,
      bottomRight, // rename to tools
      bottomLeft,
      currentMembers,
      referFromCoords,
      referToCoords,
      graphs,
      replayer,
      currentTab,
      roomName,
      loaded,
      activity,
      encompass,
      chatExpanded,
      membersExpanded,
    } = this.props;
    // Set text for taking control button based on current control
    // let controlText = 'Take Control';
    // let inControl = false;
    // if (room.controlledBy === user._id) {
    //   controlText = 'Release Control';
    //   inControl = true;
    // }
    // else if (room.controlledBy) controlText = 'Request Control';

    // let bottomButton;
    // if (role === 'facilitator' && !activityWorkspace) {
    //     bottomButton = <div><Button click={setStartingPoint}>Set starting point</Button></div>
    // } else if (role === 'participant' && activityWorkspace) {
    //   bottomButton = <div><Button click={copyActivity}>Add To My Activities</Button></div>
    // }
    let membersHeight = 'auto';
    let chatHeight = '43%';
    let flexB = '0';
    if (!chatExpanded) {
      chatHeight = 'auto';
      if (membersExpanded) {
        membersHeight = '33%';
      }
    }
    // This is annoying but the flexx basis behavior is not consistant across browsers and it is messing up how
    // the right panel elements collapse and expand....there's gotta be a better way to do this
    if (typeof InstallTrigger !== 'undefined' && chatExpanded) {
      // If this is Firefox
      flexB = 'auto';
    }
    console.log({ referToCoords, referFromCoords });
    return (
      <div
        className={classes.PageContainer}
        style={{ visibility: loaded || activity ? 'visible' : 'hidden' }}
      >
        {!encompass ? <div className={classes.Background} /> : null}
        <div className={classes.Container}>
          <div className={classes.Left}>
            <div className={classes.TabsAndTitle}>
              <div className={classes.WorkspaceTabs}>{tabs}</div>
              <h2 className={classes.Title}>{roomName}</h2>
            </div>
            <div
              ref={this.Graph}
              className={[
                replayer ? classes.ReplayerTop : classes.Top,
                'graph',
              ].join(' ')}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              {graphs.map((graph, i) => {
                return (
                  <div
                    key={graph}
                    className={replayer ? classes.ReplayerGraph : classes.Graph}
                    style={{
                      zIndex: currentTab === i ? 100 : 0,
                      display: 'flex',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                    }}
                  >
                    {/**  "graph" class here is so geogebra applet will scale to container */}
                    {graph}
                  </div>
                );
              })}
              {replayer ? (
                <div className={classes.ReplayerBottom}>{bottomLeft}</div>
              ) : null}
            </div>
            {!replayer ? (
              <div className={classes.Bottom}>{bottomLeft}</div>
            ) : null}
          </div>
          <div className={classes.Right}>
            <div
              className={classes.Chat}
              style={{ height: chatHeight, flexBasis: flexB }}
            >
              {chat}
            </div>
            <div className={activity ? classes.ActivityTools : classes.Tools}>
              {bottomRight}
            </div>
            <div className={classes.Members} style={{ height: membersHeight }}>
              {currentMembers}
            </div>
          </div>
          {referToCoords && referFromCoords ? (
            <div className={classes.ReferenceLine}>
              <svg height="100%" width="100%" style={{ zIndex: 12000 }}>
                <defs>
                  <marker
                    id="arrow"
                    markerWidth="10"
                    markerHeight="10"
                    refX="8"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L9,3 z" fill="#2D91F2" />
                  </marker>
                </defs>
                <line
                  style={{ zIndex: 2500 }}
                  x2={referToCoords.left} // -10 for width of arrow
                  y2={referToCoords.top}
                  x1={referFromCoords.left}
                  y1={referFromCoords.top}
                  stroke="#2D91F2"
                  strokeWidth="3"
                  markerEnd="url(#arrow)"
                />
                {/* <g
                  x
                >
                  <path
                    fill="#2D91F2"

                    d="M145.188,238.575l215.5-215.5c5.3-5.3,5.3-13.8,0-19.1s-13.8-5.3-19.1,0l-225.1,225.1c-5.3,5.3-5.3,13.8,0,19.1l225.1,225
		c2.6,2.6,6.1,4,9.5,4s6.9-1.3,9.5-4c5.3-5.3,5.3-13.8,0-19.1L145.188,238.575z"
                  />
                </g> */}
              </svg>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

WorkspaceLayout.propTypes = {
  chat: PropTypes.element,
  tabs: PropTypes.element.isRequired,
  bottomRight: PropTypes.element.isRequired, // rename to tools
  bottomLeft: PropTypes.element.isRequired,
  currentMembers: PropTypes.element,
  referFromCoords: PropTypes.shape({}),
  referToCoords: PropTypes.shape({}),
  graphs: PropTypes.arrayOf(PropTypes.element).isRequired,
  replayer: PropTypes.bool,
  currentTab: PropTypes.number.isRequired,
  roomName: PropTypes.string.isRequired,
  loaded: PropTypes.bool,
  activity: PropTypes.bool,
  isFullscreen: PropTypes.bool,
  encompass: PropTypes.bool,
  chatExpanded: PropTypes.bool,
  membersExpanded: PropTypes.bool,
};

WorkspaceLayout.defaultProps = {
  activity: false,
  currentMembers: null,
  chat: null,
  replayer: false,
  loaded: true,
  isFullscreen: false,
  encompass: false,
  referFromCoords: null,
  referToCoords: null,
  chatExpanded: true,
  membersExpanded: true,
};
export default WorkspaceLayout;
