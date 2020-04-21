import React, { Component, useState } from 'react';
import PropTypes from 'prop-types';
import { TextInput } from '@ohif/ui';

class ACDialog extends Component {
  static propTypes = {
    children: PropTypes.node,
    componentRef: PropTypes.any,
    componentStyle: PropTypes.object,
    rootClass: PropTypes.string,
    isOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
  };

  static defaultProps = {
    isOpen: true,
    componentStyle: {},
    rootClass: '',
  };

  static InputDialog = ({ onSubmit, title, onClose }) => {
    const [kernelSize, setKernelSize] = useState(4);
    const [alpha, setAlpha] = useState(2);
    const [beta, setBeta] = useState(0.5);
    const [wLine, setWLine] = useState(0.5);
    const [wEdge, setWEdge] = useState(0.5);
    const [minDist, setMinDist] = useState(3);
    const [maxDist, setMaxDist] = useState(6);
    const [threshold, setThreshold] = useState(90);
    const [it, setIt] = useState(100);

    const onSubmitHandler = () => {
      onSubmit({
        kernelSize,
        alpha,
        beta,
        wLine,
        wEdge,
        minDist,
        maxDist,
        threshold,
      });
    };

    return (
      <div className="InputDialog">
        <ACDialog onClose={onClose} onConfirm={onSubmitHandler}>
          <TextInput
            type="text"
            value={kernelSize}
            onChange={event => setKernelSize(event.target.value)}
            label="KernelSize"
            id="KernelSize"
          />
          <TextInput
            type="text"
            value={alpha}
            onChange={event => setAlpha(event.target.value)}
            label="Alpha"
            id="Alpha"
          />
          <TextInput
            type="text"
            value={beta}
            onChange={event => setBeta(event.target.value)}
            label="Beta"
            id="Beta"
          />
          <TextInput
            type="text"
            value={wLine}
            onChange={event => setWLine(event.target.value)}
            label="WLine"
            id="WLine"
          />
          <TextInput
            type="text"
            value={wEdge}
            onChange={event => setWEdge(event.target.value)}
            label="WEdge"
            id="WEdge"
          />
          <TextInput
            type="text"
            value={minDist}
            onChange={event => setMinDist(event.target.value)}
            label="MinDist"
            id="MinDist"
          />
          <TextInput
            type="text"
            value={maxDist}
            onChange={event => setMaxDist(event.target.value)}
            label="MaxDist"
            id="MaxDist"
          />
          <TextInput
            type="text"
            value={threshold}
            onChange={event => setThreshold(event.target.value)}
            label="Threshold"
            id="Threshold"
          />
          <TextInput
            type="text"
            value={it}
            onChange={event => setIt(event.target.value)}
            label="Iterations"
            id="Iterations"
          />
        </ACDialog>
      </div>
    );
  };

  render() {
    return (
      <React.Fragment>
        {this.props.isOpen && (
          <div
            className={`simpleDialog ${this.props.rootClass} `}
            ref={this.props.componentRef}
            style={this.props.componentStyle}
          >
            <form>
              <div className="header">
                <span className="closeBtn" onClick={this.onClose}>
                  <span className="closeIcon">x</span>
                </span>
                <h4 className="title">Active Contour tool settings</h4>
              </div>
              <div className="content">{this.props.children}</div>
              <div className="footer">
                <button className="btn btn-default" onClick={this.onClose}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={this.onConfirm}>
                  Confirm
                </button>
              </div>
            </form>
          </div>
        )}
      </React.Fragment>
    );
  }

  onClose = event => {
    event.preventDefault();
    event.stopPropagation();
    this.props.onClose();
  };

  onConfirm = event => {
    event.preventDefault();
    event.stopPropagation();
    this.props.onConfirm();
  };
}

export { ACDialog };
