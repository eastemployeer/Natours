/* eslint-disable */
// const locations = JSON.parse(document.getElementById('map').dataset.locations);
// console.log(locations);

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiZWFzdGVtcGxveWVlciIsImEiOiJja2wyaGgwY2QxZTh2MzBtc2RnMzcxdm9iIn0.bw57IGksZ71fscCHo4I1Zg';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/eastemployeer/ckl2hyfhh10jm19qoq52yw5ax',
    scrollZoom: false,
    //   center: [-118.11349, 34.111745], //tak jak w MongoDB, najpierw longitude potem latitude, odwrotnie jest w requestcie do API
    //   zoom: 4,
    //   interactive: false,
  });
  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Add a marker
    const el = document.createElement('div');
    el.className = 'marker';

    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom', //tzn ze bedzie przyczepiony swoim dołem do mapy (ten marker/ikonka)
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //popup - nie dziala z jakiegos powodu
    //   new mapboxgl.Popup()
    //     .setLngLat(loc.coordinates)
    //     .setHtml(`<p>Day ${loc.day}: ${loc.description}</p>`)
    //     .addTo(map);

    //zwiększenie obszaru mapki
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200, //paddingi
      bottom: 200,
      left: 100,
      right: 100,
    },
  });
};
