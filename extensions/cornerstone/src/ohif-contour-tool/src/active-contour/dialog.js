import React, { Component, useState } from 'react';
import PropTypes from 'prop-types';
import { TextInput, Range, Tooltip } from '@ohif/ui';

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
    const [threshold, setThreshold] = useState(50);
    const [gamma, setGamma] = useState(100);
    const [it, setIt] = useState(100);

    const onSubmitHandler = () => {
      onSubmit({
        threshold,
        gamma,
        it,
      });
    };

    return (
      <div className="InputDialog">
        <ACDialog onClose={onClose} onConfirm={onSubmitHandler}>
          <TextInput
            type="text"
            value={threshold}
            onChange={event => setThreshold(event.target.value)}
            label="Threshold"
            id="Threshold"
          />
          <TextInput
            type="text"
            value={gamma}
            onChange={event => setGamma(event.target.value)}
            label="Gamma"
            id="Gamma"
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
