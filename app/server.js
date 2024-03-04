const express = require('express');
const passport = require('passport');
const xsenv = require('@sap/xsenv');
const JWTStrategy = require('@sap/xssec').JWTStrategy;
const axios = require('axios');

const app = express();

//configure passport - get first audience for xsuaa
const xsuaaService = xsenv.getServices({ myXsuaa: { tag: 'xsuaa' }});
const xsuaaCredentials = xsuaaService.myXsuaa; 
const jwtStrategy = new JWTStrategy(xsuaaCredentials)
passport.use('jwt1', jwtStrategy);

// configure passport - get second audience for job-scheduler
const jobSchedulerService = xsenv.getServices({ jobScheduler: { tag: 'jobscheduler' }});
const jobSchedulerCredentials = jobSchedulerService.jobScheduler.uaa; 
const jwtStrategy2 = new JWTStrategy(jobSchedulerCredentials)
passport.use('jwt2', jwtStrategy2);

app.use(passport.initialize());
app.use(passport.authenticate(['jwt1', 'jwt2'], { session: false }));



app.get('/notificar', function(req, res){
    axios.get('https://cap-capcf-grp-js.cfapps.us10.hana.ondemand.com/vat.xsjs?method=get-ejecutores')
        .then(response => {
            // Handle the response data
            if (response.data.length){
                const url = 'https://sendMail.cfapps.us10.hana.ondemand.com/send';
                
                const config = {
                    headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic Ymx1ZWJvb3Q6czMzM25kYmx1bWFs'
                    }
                };

                response.data.forEach((ejecutor, i) => {

                    const delay = i * 2500; 

                    setTimeout(() => {                                                
                        
                        const data = {
                            "sendTo": ejecutor.ejecutorEmail,
                            "subject": "VAT #" + ejecutor.id + " - Recordatorio de Evaluacion de Entorno",
                            "mailBody": `Estimado/a ` + ejecutor.ejecutorNombre + `,
                            
Se le recuerda que debe realizar la evaluacion de entorno del dia de hoy para el VAT #` + ejecutor.id + `.
Por favor realizarlo a la brevedad.
                            
Muchas gracias,
GRP Digital.`
                        }
                        
                        axios.post(url, data, config )
                        .then(response => {
                            // Handle the response data
                            console.log("Mail enviado con éxito.");                     
                        }).catch(error => {
                            console.error(error);
                        });  
                    }, delay);
                })
            } else {
                console.log("No se obtuvieron Ejecutores.");
            }
        })
        .catch(error => {
            // Handle any error that occurred during the request
            console.error(error);
    });

    console.log('==> [APP JOB LOG] Job is running . . .');
    res.send('Finished job');
});

const port = process.env.PORT || 3000;
app.listen(port, function(){
    console.log('listening');
})
