const { degrees, PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { writeFileSync, readFileSync } = require("fs");
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer  = require('multer');
const cron = require('node-cron');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const qrimage = require('qr-image');

const app = express()
const port = 7774;

const ws = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
    },
    puppeteer: {
        args: ['--no-sandbox']
    }
});

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

let numeros     =   [];

ws.on('ready', () => {
    console.log('[Whatsapp Web] iniciado!');
});
ws.on('qr', qr => {
    var qr_svg = qrimage.image(qr, { type: 'png' });
    qr_svg.pipe(require('fs').createWriteStream('i_love_qr.png'));
});

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
    // const clientNumber      =   data[0].phone + '@c.us';
    // const agentNumber       =   data[0].agentPhone + '@c.us';

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log('Error al enviar el correo: ', error);
            return res.sendStatus(500);
        } else {
            console.log("[Nueva solicitud] De [%s - %s] para [%s - %s]", data[0].agent, agentNumber, data[0].name, clientNumber);
        
            // if(seguimiento[clientNumber] == undefined || seguimiento[clientNumber] == false)
            //     seguimiento[clientNumber] = true;
            // setTimeout(async () => {
            //     if(seguimiento[clientNumber] == true)
            //         await enviarImagen(clientNumber)    
            // }, 5000);
            // setTimeout(async () => {
            //     if(seguimiento[clientNumber] == true)
            //         await enviarVideo(clientNumber)
            // }, 3 * 24 * 60 * 60 * 1000)
            // setTimeout(async () => {
            //     if(seguimiento[clientNumber] == true)
            //         await enviarMensaje(clientNumber, 'Estimado cliente: Un placer saludarle en nombre del Departamento de Cotizaciones de Tu Dr. En Casa 🏡. Hemos notado que recientemente ha solicitado una cotización: ¿Presenta alguna pregunta o necesita ayuda para concluir su compra? Quedo a su disposición y atento a cualquier consulta que pueda tener.');
            // }, 5 * 24 * 60 * 60 * 1000)
            // setTimeout(async () => {
            //     if(seguimiento[clientNumber] == true)
            //         await enviarMensaje(clientNumber, 'Un placer saludarle en nombre del Departamento de Cotizaciones de Tu Dr. En Casa 🏡. Hemos notado que está próximo a vencerse la fecha de vigencia de la cotización emitida para usted, estamos comprometidos en ofrecer un servicio de excelencia para su tranquilidad. Le recordamos que ofrecemos planes diseñados a la medida, en caso de que usted requiera algún ajuste. Estamos a su disposición.');
            // }, 7 * 24 * 60 * 60 * 1000); 
            // if(!checkNumberAgent(agentNumber))
            //     numeros.push(agentNumber);
            // if(conteo[agentNumber] == undefined || conteo[agentNumber] == null)
            //     conteo[agentNumber] = data[0].name;
            // else
            //     conteo[agentNumber] = conteo[agentNumber] + ', ' + data[0].name;
            return res.sendStatus(200);
        }
    });
});

app.listen(port, () => {
    console.log(`Cotizador tu drencasa corriendo http://localhost:${port}/`)
});

ws.on('message_create', message => {
    if(message.toLowerCase() == 'finalizar' && seguimiento[message.from])
    {
        console.log('[Cancelación] %s', message.from);
        seguimiento[message.from] = false;
        ws.sendMessage(message.from, '¡Muchas gracias! Estamos para servirle 🌍👨🏻‍⚕️');
    }
});

cron.schedule('0 16 * * 5', function() {
    for(i = 0; i < numeros.length; i++) {
        if(conteo[numeros[i]] != undefined && conteo[numeros[i]] != null) {
            enviarMensaje(numeros[i], "Estimado Aliado: Un placer saludarle en nombre del Departamento Comercial de Tu Dr. En Casa 👨🏻‍⚕️🏡, Hemos notado que, durante esta semana, ha solicitado cotizaciones para los clientes: ("+conteo[numeros[i]]+") ¿Cómo podemos ayudarte para concretar esta afiliación? Estaremos atentos a su pronta respuesta.");
            conteo[numeros[i]] =   null;
        }
        else 
            enviarMensaje(numeros[i], "Estimado Aliado: Un placer saludarle en nombre del Departamento Comercial de Tu Dr. En Casa 👨🏻‍⚕️🏡, Esperamos que tengas un excelente fin de semana. Hemos notado que no has tenido actividad dentro de nuestro cotizador en línea, si necesitas ayuda o tienes alguna pregunta, estamos aquí para apoyarte.");
    }
});


async function enviarMensaje(numero, mensaje) {
    await ws.sendMessage(numero, mensaje).then(() => {
        console.log('[Whatsapp Web] Mensaje enviado correctamente a : %s', numero);
    }).catch((error) => {
        console.error('[Whatsapp Web] Hubo un error al enviar el mensaje, posiblemente el número %s, %s', numero, error);
    });
}

async function enviarImagen(numero) {
    const fileData = fs.readFileSync("./day7.jpeg");
    const media = new MessageMedia('image/jpg', fileData.toString('base64'), 'image.jpg');
    await ws.sendMessage(numero, media).then(() => {
        console.log('[Whatsapp Web] Imagen enviada correctamente a : %s', numero);
    }).catch((error) => {
        console.error('Hubo un error al enviar la imagen, posiblemente el número %s, %s', numero, error);
    });
}

async function enviarVideo(numero) {
    const fileData = fs.readFileSync("./day3.mp4");
    const media = new MessageMedia('video/mp4', fileData.toString('base64'), 'video.mp4');
    await ws.sendMessage(numero, media).then(() => {
        console.log('[Whatsapp Web] Video enviado correctamente a : %s', numero);
    }).catch((error) => {
        console.error('[Whatsapp Web] Hubo un error al enviar el video, posiblemente el número %s, %s', numero, error);
    });
}

app.use('/pdf', express.static('pdf'));
app.post('/testing-pdf', async (req, res) => {
    const structure = req.body.structure;
    console.log(structure); //justo acá
    const testingData   =   [
        "Nombre de Prueba",
        "Dirección de Prueba",
        5000,
        10000
    ];
    createPDF(testingData, structure, true).catch((err) => console.log(err));
    return res.sendStatus(200);
});
app.post('/upload-pdf', upload.single('file'), (req, res) => {
    // 'file' es el nombre del campo que contiene el archivo en la solicitud
    // req.file es el archivo cargado

    res.sendStatus(200);
});

async function createPDF(data, structurePdf, testing = false) {
    console.log(structurePdf); // Para depurar
    const document  =   await PDFDocument.load(readFileSync("./pdf/cotizacion.pdf"));
    const usePage   =   document.getPage(1);

    const regex = /(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*([\/*]?)(\d*),\s*(\d*),\s*(\d*)/g;
    let match;
    const coordinates = [];

    while ((match = regex.exec(structurePdf)) !== null) {
        coordinates.push({ x: parseFloat(match[1]), y: parseFloat(match[2]), op: match[3], val: match[4], fixedVal: match[5], varVal: match[6] });
    }
    
    console.log(coordinates);
    usePage.moveTo(165, 764);
    usePage.drawText(getStringDate(), {
        size: 12
    });
    for(let i = 0; i < coordinates.length; i++) {
        const { x, y, op, val, fixedVal, varVal } = coordinates[i];
        let textToDraw;
    
        if(fixedVal !== '0') {
            textToDraw = fixedVal;
        } else {
            if(varVal != '0')
                textToDraw  =   data[varVal];
            else 
                textToDraw = data[i];
        }

        if(op && val) {
            const numericVal = parseFloat(val);
            const dataVal = parseFloat(textToDraw);
            if(op === '*') {
                textToDraw = (dataVal * numericVal).toFixed(2);
            } else if(op === '/') {
                textToDraw = (dataVal / numericVal).toFixed(2);
            }
            textToDraw  =   "$"+textToDraw;
        }

        usePage.moveTo(y, x);
        usePage.drawText(textToDraw, {
            size: 12 // Puedes ajustar el tamaño según sea necesario
        });
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
function checkNumberAgent(n) {
    let exists  =   false;
    for(var i = 0; i < numeros.length; i++) {
        if(numeros[i] == n) {
            exists  =   true;
            break;
        }
    }
    return exists;
}

// ws.initialize();