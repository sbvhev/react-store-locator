import React, { Component } from 'react'
import GoogleMap from 'google-map-react'
import { fitBounds } from 'google-map-react/utils'
import geolib from 'geolib'
import Pin from './Pin'
import Info from './Info'
import GoogleMarker from './GoogleMarker'
import infoStyle from './InfoStyle'
import searchStyle from './SearchStyle'
import { Subscribe } from 'statable'
import { mapState } from '../state'

function findLocationIndex(id, locations) {
  for (let i = locations.length; i--; ) {
    if (locations[i].id === id) {
      return i
    }
  }
  return null
}

export default class Map extends Component {
  constructor(props) {
    super(props)
    this.createMapOptions = this.createMapOptions.bind(this)
    this.changeMap = this.changeMap.bind(this)
    this.toggleLocation = this.toggleLocation.bind(this)
    this.closeLocation = this.closeLocation.bind(this)
    this.onPlacesChanged = this.onPlacesChanged.bind(this)
    this.initCenterMap = this.initCenterMap.bind(this)
    this.checkGoogleMarker = this.checkGoogleMarker.bind(this)
    this.handleMapLoad = this.handleMapLoad.bind(this)

    this.state = {
      locations: [],
      foundLocations: [],
      center: null,
      zoom: null,
      googleMarkers: [],
      places: null,
      loading: true,
      movingMarkers: []
    }
  }

  checkGoogleMarker() {
    for (let i = this.state.googleMarkers.length; i--; ) {
      this.state.googleMarkers[i].setMap(null)
    }
    for (let i = this.state.movingMarkers.length; i--; ) {
      this.state.movingMarkers[i].setMap(null)
    }
    this.setState({
      googleMarkers: [],
      movingMarkers: []
    })
  }

  changeMap(props) {
    if (this.state.loading) return

    if (this.props.centerMarker) {
      let movingMarkers = [...this.state.movingMarkers]
      if (movingMarkers.length > 0) {
        this.checkGoogleMarker()
      }
      const marker = GoogleMarker(
        this.props.centerMarker,
        this.map,
        props.center
      )
      if (this.state.googleMarkers.length > 0) {
        const newMarker = {
          lat: marker.position.lat().toFixed(4),
          lng: marker.position.lng().toFixed(4)
        }
        const currentMarker = {
          lat: this.state.googleMarkers[0].position.lat().toFixed(4),
          lng: this.state.googleMarkers[0].position.lng().toFixed(4)
        }
        if (
          newMarker.lng === currentMarker.lng &&
          newMarker.lat === currentMarker.lat
        ) {
          marker.setMap(null)
        }
      }
      movingMarkers.push(marker)
      this.setState({
        movingMarkers
      })
      if (this.state.movingMarkers.length > 1) {
        this.state.movingMarkers[0].setMap(null)
        this.setState({
          movingMarkers: this.state.movingMarkers.slice(1)
        })
      }
    }

    const {
      bounds: { ne, nw, se, sw }
    } = props
    const { locations } = this.state
    if (locations) {
      const foundLocations = locations.filter(location => {
        if (
          location.lat > se.lat &&
          sw.lat &&
          (location.lat < ne.lat && nw.lat) &&
          (location.lng > nw.lng && sw.lng) &&
          (location.lng < ne.lng && se.lng)
        ) {
          return location
        }
      })
      foundLocations.map(location => {
        const distanceMeters = geolib.getDistance(props.center, {
          lat: location.lat,
          lng: location.lng
        })
        const distanceMiles = (distanceMeters * 0.000621371).toFixed(2)
        location.distanceFromCenter = distanceMiles
        return location
      })
      this.setState({ foundLocations })
      if (this.props.onChange) {
        this.props.onChange(foundLocations)
      }
    }
  }

  toggleLocation(id) {
    const index = findLocationIndex(id, this.state.locations)
    if (index !== null) {
      const locations = this.state.locations
      locations.forEach(item => {
        item.show ? (item.show = false) : (item.show = item.show)
      })
      locations[index].show = !locations[index].show
      this.setState({ locations })
    }
  }

  closeLocation(id) {
    const index = findLocationIndex(id, this.state.locations)
    if (index !== null) {
      const locations = this.state.locations
      locations[index].show = false
      this.setState({ locations })
    }
  }

  createMapOptions(maps) {
    return {
      styles: this.props.mapStyle
    }
  }

  initCenterMap() {
    const { google } = this.props

    const { newBounds } = mapState.state
    let size = {}
    if (this.mapEl) {
      size = {
        width: this.mapEl.offsetWidth,
        height: this.mapEl.offsetHeight
      }
    }

    const { center, zoom } = fitBounds(newBounds, size)

    if (this.props.searchMarker) {
      this.checkGoogleMarker()

      const marker = GoogleMarker(
        this.props.searchMarker,
        this.map,
        props.center
      )
      this.setState({
        googleMarkers: [...this.state.googleMarkers, marker]
      })
    }

    this.setState({
      center: center,
      zoom: zoom.toString().length > 1 ? 9 : zoom
    })
  }

  onPlacesChanged() {
    const { google } = this.props
    let places = this.searchBox.getPlaces()
    if (places === this.state.places) places = undefined
    if (places) {
      if (this.props.submitSearch) {
        this.props.submitSearch()
      }
      this.setState({ places })
      if (places.length > 0) {
        const firstLocation = places[0]
        const { geometry } = firstLocation
        const newBounds = {
          ne: {
            lat: geometry.viewport.getNorthEast().lat(),
            lng: geometry.viewport.getNorthEast().lng()
          },
          sw: {
            lat: geometry.viewport.getSouthWest().lat(),
            lng: geometry.viewport.getSouthWest().lng()
          }
        }
        let size = {}
        if (this.mapEl) {
          size = {
            width: this.mapEl.offsetWidth,
            height: this.mapEl.offsetHeight
          }
        }

        const { center, zoom } = fitBounds(newBounds, size)
        if (this.props.searchMarker) {
          this.checkGoogleMarker()

          const marker = GoogleMarker(this.props.searchMarker, this.map, center)
          this.setState({
            googleMarkers: [...this.state.googleMarkers, marker]
          })
        }

        this.setState({
          center: center,
          zoom: zoom.toString().length > 1 ? 9 : zoom
        })
      }
    }
  }

  componentDidMount() {
    this.changeMap()

    if (mapState.state) {
      mapState.subscribe(state => {
        if (state.newBounds) {
          this.initCenterMap()
        }
      })
    }

    const { google } = this.props
    const input = this.searchInput
    if (this.props.initSearch) {
      input.value = this.props.initSearch
    }
    this.searchBox = new google.maps.places.SearchBox(input)
    this.searchBox.addListener('places_changed', this.onPlacesChanged)

    let defaultZoom = 8,
      defaultCenter = { lat: 0, lng: 180 }
    if (
      !this.props.initSearch &&
      (this.props.locations && this.props.locations.length > 0)
    ) {
      const bounds = new google.maps.LatLngBounds()
      this.props.locations.map(location => {
        bounds.extend(new google.maps.LatLng(location.lat, location.lng))
      })
      const newBounds = {
        ne: {
          lat: bounds.getNorthEast().lat(),
          lng: bounds.getNorthEast().lng()
        },
        sw: {
          lat: bounds.getSouthWest().lat(),
          lng: bounds.getSouthWest().lng()
        }
      }
      let size = {}
      if (this.mapEl) {
        size = {
          width: this.mapEl.offsetWidth,
          height: this.mapEl.offsetHeight
        }
      }
      const { center, zoom } = fitBounds(newBounds, size)
      defaultZoom = zoom
      defaultCenter = center
    }

    this.setState({
      locations: this.props.locations,
      zoom: defaultZoom,
      center: defaultCenter,
      loading: false
    })
  }

  componentWillUnmount() {
    mapState.unsubscribe()
  }

  handleMapLoad({ map, maps }) {
    this.map = map
    console.log('Map Loaded')
    if (this.props.initSearch) {
      const service = new google.maps.places.PlacesService(map)
      service.textSearch(
        {
          location: map.getCenter(),
          query: this.props.initSearch
        },
        (results, status) => {
          const result = results[0]
          if (status == google.maps.places.PlacesServiceStatus.OK) {
            const { geometry } = result
            const newBounds = {
              ne: {
                lat: geometry.viewport.getNorthEast().lat(),
                lng: geometry.viewport.getNorthEast().lng()
              },
              sw: {
                lat: geometry.viewport.getSouthWest().lat(),
                lng: geometry.viewport.getSouthWest().lng()
              }
            }
            const size = {
              width: this.mapEl.offsetWidth,
              height: this.mapEl.offsetHeight
            }
            const { center, zoom } = fitBounds(newBounds, size)
            if (this.props.searchMarker) {
              const marker = GoogleMarker(this.props.searchMarker, map, center)
              this.setState({
                googleMarkers: [...this.state.googleMarkers, marker]
              })
            }

            this.setState({
              center: center,
              zoom: zoom.toString().length > 1 ? 9 : zoom,
              loading: false
            })
          }
        }
      )
    }
    this.setState({ loading: false })
  }

  render() {
    let Pin = this.props.pin.component || this.props.pin
    return (
      <div
        style={{
          height: this.props.height,
          width: this.props.width,
          position: 'relative'
        }}
        ref={mapEl => (this.mapEl = mapEl)}
      >
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: 5,
            zIndex: 2
          }}
        >
          <input
            className="storeLocatorInput"
            style={searchStyle.searchInput}
            onChange={this.onPlacesChanged}
            ref={input => (this.searchInput = input)}
            type="text"
            placeholder="Enter Your Location..."
          />
        </div>
        <GoogleMap
          // ref={ref => (this.map = ref)}
          onGoogleApiLoaded={this.handleMapLoad}
          yesIWantToUseGoogleMapApiInternals
          center={this.props.center || this.state.center}
          zoom={this.props.zoom || this.state.zoom}
          options={this.createMapOptions}
          onChange={this.changeMap}
        >
          {Array.isArray(this.props.locations) &&
          this.props.locations.length > 0
            ? this.props.locations.map(location => {
                return (
                  <Pin
                    key={location.id}
                    handleLocationClick={this.toggleLocation}
                    lat={location.lat}
                    lng={location.lng}
                    {...location}
                    {...this.props}
                    pinProps={this.props.pin.pinProps || null}
                  >
                    {!this.props.children ? (
                      <Info show={location.show} style={this.props.infoStyle}>
                        <div style={infoStyle.main}>
                          {Object.keys(location).map((k, i) => {
                            if (
                              k === 'id' ||
                              k === 'lat' ||
                              k === 'lng' ||
                              k === 'show'
                            )
                              return
                            return (
                              <div
                                key={k}
                                style={
                                  k === 'name'
                                    ? { marginBottom: '12px' }
                                    : { marginBottom: '2px' }
                                }
                              >
                                {`${location[k]}`}
                              </div>
                            )
                          })}
                          <div
                            style={infoStyle.close}
                            onClick={() => this.closeLocation(location.id)}
                          >
                            ×
                          </div>
                        </div>
                      </Info>
                    ) : (
                      this.props.children(location, this.closeLocation)
                    )}
                  </Pin>
                )
              })
            : null}
        </GoogleMap>
      </div>
    )
  }
}

Map.defaultProps = {
  pin: Pin,
  mapStyle: {},
  height: '800px',
  width: '100%',
  customIcon: {
    path:
      'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
    color: '#FE7569',
    borderColor: '#000'
  }
}
