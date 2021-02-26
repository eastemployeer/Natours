/* eslint-disable */
import { login, logout } from './login.js';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings.js';
import { bookTour } from './stripe.js';
import '@babel/polyfill';

//DOM elements
const mapbox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const userSettings = document.querySelector('.form-user-data');
const userPasswordSettings = document.querySelector('.form-user-password');
const logOutBtn = document.querySelector('.nav__el--logout');
//tour.pug
const bookBtn = document.getElementById('book-tour');

//mapbox
if (mapbox) {
  const locations = JSON.parse(mapbox.dataset.locations);
  displayMap(locations);
}
//login
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;
    login(email, password);
  });
}
if (userSettings) {
  userSettings.addEventListener('submit', (e) => {
    e.preventDefault();
    //tworzenie multi formularza - potrzebne w przypadku przesylania plikow
    const form = new FormData();
    form.append('name', document.getElementById('name').value); //name and value
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    // const name = document.getElementById('name').value;
    // const email = document.getElementById('email').value;
    updateSettings(form, 'data');
  });
}
if (userPasswordSettings) {
  userPasswordSettings.addEventListener('submit', async (e) => {
    e.preventDefault();

    document.querySelector('.btn--save-password').textContent = 'Updating...';

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    //await po to aby mozna było wyczyscic inputy - funkcja sie tu zatrzyma "poczeka" az do otrzymania wartosci z promise'a
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );

    //czyszczenie inputów
    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing ...';
    const tourId = e.target.dataset.tourId;
    bookTour(tourId);
  });
}
