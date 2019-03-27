import React, { Component } from "react";
import Script from "react-load-script";
import { GRAPH_HEIGHT } from "../../constants";
import Aux from "../../Components/HOC/Auxil";
import Modal from "../../Components/UI/Modal/Modal";
import API from "../../utils/apiRequests";
class DesmosReplayer extends Component {
  state = {
    tabStates: {}
  };

  calculatorRef = React.createRef();

  componentDidMount() {
    if (window.Desmos) {
      console.log("already loaded");
      let { inView, tab } = this.props;
      this.calculator = window.Desmos.GraphingCalculator(
        this.calculatorRef.current
      );
      if (inView && tab.desmosLink) {
        API.getDesmos(tab.desmosLink)
          .then(res => {
            this.calculator.setState(res.data.result.state);
            this.props.setTabLoaded(tab._id);
          })
          .catch(err => console.log(err));
      }
    }
  }

  // shouldComponentUpdate(nextProps) {
  //   if (this.props.inView && this.props.index !== nextProps.index) {
  //     return true;
  //   } else if (this.props.loading && !nextProps.loading) {
  //     return true;
  //   } else return false;
  // }

  componentWillUnmount() {
    if (this.calculator) {
      this.calculator.unobserveEvent("change");
      this.calculator.destroy();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.inView) {
      if (
        prevProps.index !== this.props.index &&
        this.props.log[this.props.index].event
      ) {
        this.calculator.setState(this.props.log[this.props.index].event);
      }
    }
  }

  onScriptLoad = () => {
    this.calculator = window.Desmos.GraphingCalculator(
      this.calculatorRef.current
    );
    let { tab } = this.props;
    if (tab.startingPoint) {
      this.calculator.setState(tab.startingPoint);
    } else if (tab.desmosLink) {
      API.getDesmos(tab.desmosLink)
        .then(res => {
          this.calculator.setState(res.data.result.state);
          // console.
          this.props.setTabLoaded(tab._id);
        })
        .catch(err => console.log(err));
    } else {
      this.calculator.setBlank();
      this.props.setTabLoaded(tab._id);
    }
  };

  render() {
    return (
      <Aux>
        {!window.Desmos ? (
          <Script
            url="https://www.desmos.com/api/v1.1/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"
            onLoad={this.onScriptLoad}
          />
        ) : null}
        <div
          style={{ height: "100%", width: "100%" }}
          id="calculator"
          ref={this.calculatorRef}
        />
      </Aux>
    );
  }
}

export default DesmosReplayer;
