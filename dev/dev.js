import React from 'react';
import { render } from 'react-dom';
import Map from '../src/containers/MapContainer';
import Info from '../src/containers/Info';
import Marker from './Marker';

const containerEl = document.createElement('div');
document.body.appendChild(containerEl);

const dealers = [
  {
    id: 1,
    lat: 50,
    lng: 25.1,
    show: false,
    name: 'First Marker'
  },
  {
    id: 2,
    lat: 50,
    lng: 25.2,
    show: true,
    name: 'Second Marker'
  },
  {
    id: 3,
    lat: 50,
    lng: 25.3,
    show: false,
    name: 'Third Marker'
  }
];

const myPin = props => (
  <div
    style={{
      cursor: 'pointer',
      backgroundColor: 'purple',
      height: '25px',
      width: '25px',
      border: '2px solid white'
    }}
    onClick={() => props.handleDealerClick(props.id)}
  >
    {props.children}
  </div>
);

render(
  <div>
    <Map pin={myPin} dealers={dealers}>
      {/* {(dealer, closeDealer) => {
        return (
          <Info show={dealer.show}>
            <div style={{ background: 'red' }}>
              {dealer.name}
              <div onClick={() => closeDealer(dealer.id)}>[x]</div>
            </div>
          </Info>
        );
      }} */}
    </Map>
  </div>,
  containerEl
);
