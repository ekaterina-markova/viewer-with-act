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
    const [alpha, setAlpha] = useState(1);
    const [beta, setBeta] = useState(0.1);
    const [externalEnergy, setExternalEnergy] = useState(1);
    const [distance, setDistance] = useState(6);
    const [it, setIt] = useState(100);

    const onSubmitHandler = () => {
      onSubmit({
        alpha,
        beta,
        externalEnergy,
        distance,
      });
    };

    return (
      <div className="InputDialog">
        <ACDialog onClose={onClose} onConfirm={onSubmitHandler}>
          <TextInput
            type="text"
            value={alpha}
            onChange={event => setAlpha(event.target.value)}
            label="Elasticity"
            id="Alpha"
          />
          <TextInput
            type="text"
            value={beta}
            onChange={event => setBeta(event.target.value)}
            label="Inflexibility"
            id="Beta"
          />
          <TextInput
            type="text"
            value={externalEnergy}
            onChange={event => setExternalEnergy(event.target.value)}
            label="External Energy"
            id="ExternalEnergy"
          />
          <TextInput
            type="text"
            value={distance}
            onChange={event => setDistance(event.target.value)}
            label="Distance"
            id="Distance"
          />
          <label>
            Iterations:
          <Range
            type="range"
            name="Iterations"
            min={10}
            max={200}
            step={5}
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
