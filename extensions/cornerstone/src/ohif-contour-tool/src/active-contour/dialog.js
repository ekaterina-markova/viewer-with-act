import React, { Component, useState } from 'react';
import PropTypes from 'prop-types';
import { Range} from '@ohif/ui';

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
          <label>
            Threshold: {threshold}
            <Range
              type="range"
              name="Threshold"
              min={10}
              max={255}
              step={1}
              value={threshold}
              onChange={event => setThreshold(parseInt(event.target.value))}
              id="Threshold"
            />
          </label>
          <label>
            External energy: {gamma}
            <Range
              type="range"
              name="Gamma"
              min={5}
              max={200}
              step={1}
              value={gamma}
              onChange={event => setGamma(parseInt(event.target.value))}
              id="Gamma"
            />
          </label>
          <label>
            Iterations: {it}
            <Range
              type="range"
              name="Iterations"
              min={10}
              max={500}
              step={1}
              value={it}
              onChange={event => setIt(parseInt(event.target.value))}
              id="Iterations"
            />
          </label>

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
