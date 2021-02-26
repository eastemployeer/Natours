/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts.js';
export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      //relative path - works because API and website is hold on the same url so: (dev) http://127.0.0.1:3000/
      //previous version just for dev: url: http://127.0.0.1:3000/api/v1/users/login
      url: '/api/v1/users/login',
      data: {
        email,
        password,
      },
    });
    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
    // console.log(res); // struktura response z axios =>
    //res = {
    //...
    //data: {
    //status: ...
    //data: {
    //....
    // }
    // }
    // }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });

    if (res.data.status === 'success') location.reload(true);
  } catch (err) {
    showAlert('error', 'Error logging out');
  }
};
