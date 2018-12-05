import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
// import registerServiceWorker from './registerServiceWorker';
import polyfills from './utils/polyfills.js'
polyfills();

ReactDOM.render(<App />, document.getElementById('root'));
// registerServiceWorker();
