const { degrees, PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { writeFileSync, readFileSync } = require("fs");
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer  = require('multer');
const venom = require('venom-bot');
const qrcode = require('qrcode');
const cron = require('node-cron');

const app = express()
const port = 7774;

let whatsapp;
let qr_svg = '';
let whatsappInfo    =   null;

var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
        user: "cotizacionestdg.ve@gmail.com",
        pass: "aocomxuabystytbh"
    }
});

app.use(express.json());
app.use(express.urlencoded());
app.use(cors());

// Configura multer para guardar los archivos cargados con el nombre 'cotizacion.pdf'
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'pdf/')
    },
    filename: function (req, file, cb) {
        cb(null, 'cotizacionx.pdf') // Aquí estableces el nombre del archivo
    }
})

const upload = multer({ storage: storage });

let seguimiento = {};
let conteo  =   {};

let numeros     =   [
    '584143027250',
    '584245718777',
    '584142073145',
    '584241764348',
    '584120208119',
    '573102144531'
];

app.use('/pdf', express.static('pdf'));
app.post('/generar-cotizacion', async (req, res) => {
    const data  =   req.body;
    createPDF(data[1], data[2]).catch((err) => console.log(err));

    let mailInfo    =   reemplazarVariables(data[3].body, data[0]);
    var mailOptions = {
        from: 'TuDrEnCasa Cotización <cotizacionestdg.ve@gmail.com>',
        to: [data[0].agentEmail, 'cotizacionestdg.ve@gmail.com'],
        // to: [data[0].agentEmail],
        subject: reemplazarVariables(data[3].subject, data[0]),
        html: mailInfo,
        attachments: [
            { 
                filename: 'Propuesta '+data[0].name+' / '+data[0].agent+'.pdf',
                path: './pdf/cotizacion_new.pdf'
            }
        ]
    };
    // const clientNumber      =   data[0].phone;
    // const agentNumber       =   data[0].agentPhone;
    // if(clientNumber == '584143027250' || clientNumber == '584245718777' || clientNumber == '584142073145' || clientNumber == '584241764348' || clientNumber == '584120208119' || clientNumber == '573102144531' || clientNumber == '584124955548') {
    //     if(seguimiento[clientNumber] == undefined || seguimiento[clientNumber] == false)
    //         seguimiento[clientNumber] = true;
    //     setTimeout(() => {
    //         if(seguimiento[clientNumber] == true)
    //             enviarMensaje(clientNumber, 'Estimado cliente: Un placer saludarle en nombre del Departamento de Cotizaciones de Tu Dr. En Casa 👨🏻‍⚕️🏡. Hemos notado que recientemente ha solicitado una cotización: ¿Presenta alguna pregunta o necesita ayuda para concluir su compra? Quedo a su disposición y atento a cualquier consulta que pueda tener\nSi usted ya contrató o no está interesado en recibir más seguimientos, favor escribir la palabra: FINALIZAR');
    //     }, 5000);
    //     setTimeout(() => {
    //         if(seguimiento[clientNumber] == true)
    //             enviarVideo(clientNumber)
    //     }, 2 * 60 * 1000)
    //     setTimeout(() => {
    //         if(seguimiento[clientNumber] == true)
    //             enviarImagen(clientNumber)
    //     }, 4 * 60 * 1000)
    //     setTimeout(() => {
    //         if(seguimiento[clientNumber] == true)
    //             enviarMensaje(clientNumber, "Estimado cliente: Un placer saludarle en nombre del Departamento de Cotizaciones de Tu Dr. En Casa 👨🏻‍⚕️🏡. Hemos notado que está próximo a vencerse la fecha de vigencia de la cotización emitida para usted, estamos comprometidos en ofrecer un servicio de excelencia para su tranquilidad. Le recordamos que ofrecemos planes diseñados a la medida, en caso que usted requiera algún ajuste. Estamos a su disposición. ");
    //     }, 6 * 60 * 1000); 
    //     if(conteo[agentNumber] == undefined)
    //         conteo[agentNumber] =   data[0].name;
    //     else
    //         conteo[agentNumber] =   conteo[agentNumber]+' '+data[0].name;
    // }
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log('Error al enviar el correo: ', error);
            return res.sendStatus(500);
        } else {
            console.log("Enviado correctamente al correo");
            return res.sendStatus(200);
        }
    });
});
app.post('/testing-pdf', async (req, res) => {
    const data  =   req.body;
    const testingData   =   [
        "Nombre de Prueba",
        "Dirección de Prueba",
        "0414-1234567",
        "user@mail.com",
        "Plan de Prueba",
        "Agente de Prueba",
        "0414-7654321",
        "agent@mail.com",
        5000,
        10000
    ];
    createPDF(testingData, data, true).catch((err) => console.log(err));
    return res.sendStatus(200);
});
app.post('/upload-pdf', upload.single('file'), (req, res) => {
    // 'file' es el nombre del campo que contiene el archivo en la solicitud
    // req.file es el archivo cargado

    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Cotizador tu drencasa corriendo http://localhost:${port}/`)
})
// iniciarWhatsapp();
// cron.schedule('*/10 * * * *', function() {
//     for(i = 0; i < numeros.length; i++) {
//         if(conteo[numeros[i]] != undefined && conteo[numeros] != null) {
//             enviarMensaje(numeros[i], "Estimado Aliado: Un placer saludarle en nombre del Departamento Comercial de Tu Dr. En Casa 👨🏻‍⚕️🏡, Hemos notado que, durante esta semana, ha solicitado cotizaciones para los clientes: ("+conteo[numeros[i]]+") ¿Cómo podemos ayudarte para concretar esta afiliación? Estaremos atentos a su pronta respuesta.");
//             conteo[numeros[i]] =   null;
//         }
//         else 
//             enviarMensaje(numeros[i], "Estimado Aliado: Un placer saludarle en nombre del Departamento Comercial de Tu Dr. En Casa 👨🏻‍⚕️🏡, Esperamos que tengas un excelente fin de semana. Hemos notado que no has tenido actividad dentro de nuestro cotizador en línea, si necesitas ayuda o tienes alguna pregunta, estamos aquí para apoyarte.");
//     }
// });

// Inicializa Venom
// venom.create().then((client) => {
//     client.onMessage((message) => {
//         if (message.body.toLowerCase() === 'finalizar' && message.isGroupMsg === false) {
//           client
//             .sendText(message.from, '¡Muchas gracias! Estamos para servirle 🌍👨🏻‍⚕️')
//             .then((result) => {
//                 console.log('Mensaje finalizado del numero: ', numero);
//                 seguimiento[numero] = false;
//             })
//             .catch((erro) => {
//               console.error('Error when sending: ', erro); //return object error
//             });
//         }
//     });

//     function enviarMensaje(numero, mensaje) {
//         client.sendText(numero, mensaje);
//     }
//     function enviarVideo(numero) {
//         fs.readFile('day3.mp4', (err, data) => {
//             if (err) {
//                 console.error('No se pudo leer el archivo de vídeo:', err);
//                 return;
//             }
//             const media = new venom.MessageMedia('video/mp4', data.toString('base64'), 'video.mp4');
//             client.sendVideo(numero, media).catch(err => console.error(err));
//         });
//     }
//     function enviarImagen(numero) {
//         fs.readFile('day7.jpeg', (err, data) => {
//             if (err) {
//                 console.error('No se pudo leer el archivo de imagen:', err);
//                 return;
//             }
//             const media = new venom.MessageMedia('image/jpeg', data.toString('base64'), 'image.jpg');
//             client.sendImage(numero, media).catch(err => console.error(err));
//         });
//     }
// });

async function createPDF(data, params, testing = false) {
    const document  =   await PDFDocument.load(readFileSync("./pdf/cotizacion.pdf"));
    const usePage   =   document.getPage(1);
    
    for(let i = 0; i < params.length; i++) {
        if(i <= 8) {
            usePage.moveTo(coordenates(params[i], 1), coordenates(params[i], 0));
            if(i == 0)
                usePage.drawText(getStringDate(), {
                    size: 11,
                });
            else
                usePage.drawText(data[i-1], {
                    size: 11,
                });
        }
        else {
            if(i < 12)
                total       =   data[8];
            else
                total       =   data[9];
            if(i == 10 || i == 13)
                total     =   (total / 2);
            if(i == 11 || i == 14)
                total     =   (total / 4);
            usePage.moveTo(coordenates(params[i], 1), coordenates(params[i], 0));
            usePage.drawText("$" + Number(total).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}), {
                size: 11,
            });
        }
    }

    document.setTitle(getStringDate()+" Cotizacion en linea cotizador -TDEC");

    if(!testing)
        writeFileSync("./pdf/cotizacion_new.pdf", await document.save());
    else
        writeFileSync("./pdf/cotizacion_testing.pdf", await document.save());
}

function getStringDate() {
    let today = new Date();

    let dd = today.getDate();
    let mm = today.getMonth() + 1;
    
    let yyyy = today.getFullYear();
    
    if (dd < 10) {
        dd = '0' + dd;
    }
    if (mm < 10) {
        mm = '0' + mm;
    }
    return dd + '/' + mm + '/' + yyyy;
}

function coordenates(i, m) {
    const data  =   i.split(",");
    return parseInt(data[m]);
}

function reemplazarVariables(mensaje, variables) {
    for (let variable in variables) {
        let valor = variables[variable];
        let regex = new RegExp('\\{' + variable + '\\}', 'g');
        mensaje = mensaje.replace(regex, valor);
    }
    return mensaje;
}