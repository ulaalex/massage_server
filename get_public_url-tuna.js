
const axios = require('axios');
module.exports.getPublicUrl = function () {




    return new Promise(async function (resolve, reject) {

        try {

            let url = `https://api.tuna.am/v1/tunnels`;

            axios.get(`${url}`, { headers: { 'accept': 'application/json', 'Authorization': 'Bearer tak_m4gqh6p8zw3736o2ty4ryj8m8gb6yhxz' }, })
                .then(response => {

                    const public_url = response.data[0].public_url;
                    resolve(public_url);
                    console.log(public_url);


                })
                .catch(error => {
                    reject(error.message);
                });


        } catch (error) {
            reject(error.message);
        }

    });




}