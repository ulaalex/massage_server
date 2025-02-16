
const fs = require("fs");
const axios = require('axios');



exports.getDataInstagram = async function (req, res) {


    return new Promise(async function (resolve, reject) {

        try {
            let currentDate = new Date();

            let tokenInst = fs.readFileSync("tokenInst.txt").toString();

            let tokenInstDateString = fs.readFileSync("tokenInstDate.txt").toString();
            let tokenInstDate = Date.parse(tokenInstDateString);

            let diffDate = (currentDate - tokenInstDate) / 86400000;



            if (tokenInst && tokenInstDateString) {


                if (diffDate > 50) {

                    await new Promise((resolve, reject) => {
                        const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${tokenInst}`;

                        axios.get(`${url}`)
                            .then(response => {
                                tokenInst = response.data.access_token; // Updated token
                                fs.writeFileSync("tokenInst.txt", `${tokenInst}`); // Записываем токен в файл
                                fs.writeFileSync("tokenInstDate.txt", `${new Date()}`); // Записываем дату создания токена в файл                               
                                resolve();
                            })
                            .catch(error => {
                                reject(error);
                            });
                    }).catch(error => {
                        reject(error);
                    });
                }



                let url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,caption,timestamp,thumbnail_url,permalink,children{fields=id,media_url,thumbnail_url,permalink}&limit=5&access_token=${tokenInst}`;

                axios.get(`${url}`)
                    .then(response => {
                        resolve(response.data);
                    })
                    .catch(error => {
                        reject(error);
                    });


            } else {
                console.log("Ошибка получения данных с Инстаграм, отсутствует токен.");
                reject(new Error("Ошибка получения данных с Инстаграм, отсутствует токен."));
            }


        } catch (error) {
            reject(error);
        }

    }).then(result => {
        res.send(result.data);
      })
      .catch(error => {
        console.error(error);
        res.status(404).send('Sorry, can\'t find that.');
      });;
}
