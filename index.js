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
const mysql = require('mysql');
const crypto = require('crypto');

// Manejador de excepciones no capturadas
process.on('uncaughtException', function(err) {
  console.error('Se capturó una excepción no manejada: ', err);
});


const app = express()
const port = 7774;

const ws = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: '/usr/bin/google-chrome-stable'
    },
    // webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1014801647-alpha.html', }
});

var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
        user: "cotizacionestdg.ve@gmail.com",
        pass: "tztuwuzdaztgmgud"
    }
});

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'tudrcasa_cotizador',
    password: 'ByWnB8dtxefyZDSL',
    database: 'tudrcasa_cotizador'
});

// connection.connect();

app.use(express.json());
app.use(express.urlencoded());
app.use(cors());

// Configura multer para guardar los archivos cargados con el nombre 'cotizacion.pdf'
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
})

const upload = multer({ storage: storage });

let seguimiento = {};
let conteo  =   {};

let numeros     =   [];

ws.on('ready', () => {
    console.log('[Whatsapp Web] iniciado!');
    testingMessage();
});
ws.on('qr', qr => {
    var qr_svg = qrimage.image(qr, { type: 'png' });
    qr_svg.pipe(require('fs').createWriteStream('i_love_qr.png'));
});

app.post('/generar-cotizacion', async (req, res) => {
    const data  =   req.body;
    console.log(data);
    createPDF(data[0]).catch((err) => console.log(err));
    let mailInfo    =   reemplazarVariables(data[1].body, data[0]);
    var mailOptions = {
        from: 'TuDrEnCasa Cotización <cotizacionestdg.ve@gmail.com>',
        to: [data[0].email, 'cotizacionestdg.ve@gmail.com'],
        //to: [data[0].agentEmail],
        subject: reemplazarVariables(data[1].subject, data[0]),
        html: mailInfo,
        attachments: [
            { 
                filename: 'Propuesta '+data[0].nombre+' / '+data[0].agente+'.pdf',
                path: './uploads/propuesta_economica_2.pdf'
            }
        ]
    };
    const clientNumber      =   data[0].telefono + '@c.us';

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log('Error al enviar el correo: ', error);
            return res.sendStatus(500);
        } else {
            console.log('Correo enviado: ' + info.response);
            return res.sendStatus(200);
        }
        // } else {
        //     console.log("[Nueva solicitud] De [%s] para [%s - %s]", data[0].agente, data[0].nombre, clientNumber);

        //     let now     =   new Date();
    
        //     connection.query('SELECT * FROM bot_contenidos ORDER BY dia ASC', function (error, results, fields) {
        //         if (error) throw error;
        //         for (let i = 0; i < results.length; i++) {
        //             const row = results[i];
        //             const futureDate = new Date(now.getTime() + row.dia * 24 * 60 * 60 * 1000);
        //             connection.query('SELECT * FROM bot_fechas WHERE clientNumber = ? AND dateStart > NOW()', [clientNumber], function (error, results, fields) {
        //                 if (error) throw error;
        //                 if (results.length == 0) {
        //                     if(row.pos == 0) {
        //                         if (row.formato == 'imagen') {
        //                             enviarImagen(clientNumber, row.texto);
        //                         } else if (row.formato == 'video') {
        //                             enviarVideo(clientNumber, row.texto);
        //                         } else if (row.formato == 'texto') {
        //                             enviarMensaje(clientNumber, row.texto);
        //                         }
        //                     }else {
        //                         connection.query('INSERT INTO bot_fechas (clientNumber, dateStart, pos) VALUES (?, ?, ?)', [clientNumber, futureDate, row.pos], function (error, results, fields) {
        //                             if (error) throw error;
        //                             console.log("[Nueva solicitud] Registrado en la base de datos");
        //                         });
        //                     }
        //                 } else {
        //                     console.log("[Nueva solicitud] El cliente ya tiene un seguimiento programado");
        //                 }
        //             });
        //         }
        //     });
        
        //     return res.sendStatus(200);
        // }
    });
    return res.sendStatus(200);
});

cron.schedule('0 13 * * *', function() {
    const today = new Date();
    connection.query('SELECT * FROM bot_fechas WHERE DATE(dateStart) = DATE(?) ORDER BY dateStart ASC', [today], function (error, results, fields) {
        if (error) throw error;
        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            connection.query('SELECT * FROM bot_contenidos WHERE pos = ?', [row.pos], function (error, results, fields) {
                if (error) throw error;
                const contenido = results[0];
                if (contenido.formato == 'imagen') {
                    enviarImagen(row.clientNumber, contenido.texto);
                } else if (contenido.formato == 'video') {
                    enviarVideo(row.clientNumber, contenido.texto);
                } else if (contenido.formato == 'texto') {
                    enviarMensaje(row.clientNumber, contenido.texto);
                }
            });
        }
    });
});

function testingMessage() {
    const today = new Date();
    connection.query('SELECT * FROM bot_fechas WHERE DATE(dateStart) = DATE(?) ORDER BY dateStart ASC', [today], function (error, results, fields) {
        if (error) throw error;
        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            connection.query('SELECT * FROM bot_contenidos WHERE pos = ?', [row.pos], function (error, results, fields) {
                if (error) throw error;
                const contenido = results[0];
                if (contenido.formato == 'imagen') {
                    enviarImagen(row.clientNumber, contenido.texto);
                } else if (contenido.formato == 'video') {
                    enviarVideo(row.clientNumber, contenido.texto);
                } else if (contenido.formato == 'texto') {
                    enviarMensaje(row.clientNumber, contenido.texto);
                }
            });
        }
    });
}

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

async function enviarImagen(numero, ruta) {
    const fileData = fs.readFileSync(ruta);
    const media = new MessageMedia('image/jpg', fileData.toString('base64'), 'image.jpg');
    await ws.sendMessage(numero, media).then(() => {
        console.log('[Whatsapp Web] Imagen enviada correctamente a : %s', numero);
    }).catch((error) => {
        console.error('Hubo un error al enviar la imagen, posiblemente el número %s, %s', numero, error);
    });
}

async function enviarVideo(numero, ruta) {
    const fileData = fs.readFileSync(ruta);
    const media = new MessageMedia('video/mp4', fileData.toString('base64'), 'video.mp4');
    await ws.sendMessage(numero, media).then(() => {
        console.log('[Whatsapp Web] Video enviado correctamente a : %s', numero);
    }).catch((error) => {
        console.error('[Whatsapp Web] Hubo un error al enviar el video, posiblemente el número %s, %s', numero, error);
    });
}

app.use('/uploads', express.static('uploads'));
app.post('/upload-pdf', upload.single('file'), (req, res) => {
    // 'file' es el nombre del campo que contiene el archivo en la solicitud
    // req.file es el archivo cargado

    res.sendStatus(200);
});

let inputFormTest   =   {
    nombre: 'Juan Perez',
    email: '',
    telefono: '',
    agente: 'Jose Perez',
    plan_inicial_poblacion: 1,
    plan_ideal_1: 2,
    plan_ideal_2: 1,
    plan_ideal_3: 2,
    plan_especial_1: 3,
    plan_especial_2: 1,
    plan_especial_3: 4,
    plan_especial_4: 1,
    'plan-inicial-remove': 0,
    'plan-ideal-remove': 0,
    'plan-especial-remove': 0
}
createPDF(inputFormTest).catch((err) => console.log(err));

async function createPDF(data) {
    const document  =   await PDFDocument.load(readFileSync("./uploads/nuevo.pdf"));

    // Restablecer la página activa y añadir contenido

    const usePage = document.getPage(0); // Usar la página anterior o ajustar según tus necesidades
    usePage.moveTo(45, 624);
    usePage.drawText(data.nombre, {
        size: 16,
        font: await document.embedFont(StandardFonts.HelveticaBold) // Use a bold font
    });

    /* pagina 1 */
    if(data['plan-inicial-remove'] == 0) {
        const usePage1 = document.getPage(2); // Usar la página anterior o ajustar según tus necesidades
        usePage1.moveTo(158, 782);
        usePage1.drawText(data.nombre, {
            size: 9
        });
        usePage1.moveTo(144, 767);
        usePage1.drawText(getStringDate(), {
            size: 9
        });
        usePage1.moveTo(145, 750);
        usePage1.drawText(data.agente, {
            size: 9
        });
        usePage1.moveTo(430, 432);
        usePage1.drawText(`${(data.plan_inicial_poblacion * 120).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, {
            size: 10,
            font: await document.embedFont(StandardFonts.HelveticaOblique)
        });
        usePage1.moveTo(430, 415);
        usePage1.drawText(`${(data.plan_inicial_poblacion * 60).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, {
            size: 10,
            font: await document.embedFont(StandardFonts.HelveticaOblique) 
        });
        usePage1.moveTo(430, 397);
        usePage1.drawText(`${(data.plan_inicial_poblacion * 30).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, {
            size: 10,
            font: await document.embedFont(StandardFonts.HelveticaOblique) 
        });
    }
    else
        document.removePage(2);

    /* pagina 2 */
    if(data['plan-ideal-remove'] == 0) {
        const usePage2 = document.getPage(3); // Usar la página anterior o ajustar según tus necesidades
        usePage2.moveTo(158, 782);
        usePage2.drawText(data.nombre, {
            size: 9
        });
        usePage2.moveTo(144, 767);
        usePage2.drawText(getStringDate(), {
            size: 9
        });
        usePage2.moveTo(145, 750);
        usePage2.drawText(data.agente, {
            size: 9
        });
    
        let coordenadaPoblacion = [365, 350, 335];
    
        for(let i = 1; i <= 3; i++) {
            usePage2.moveTo(178, coordenadaPoblacion[i-1]);
            usePage2.drawText(''+data['plan_ideal_'+i], {
                size: 9
            });
        }
    
        let precios     =   [
            [140, 160, 180, 240, 280],
            [180, 200, 220, 280, 300],
            [230, 250, 280, 335, 365]
        ];
        let cordenadaX = [230, 300, 370, 443, 510];
        let coordenadaY = [365, 350, 335];
    
        let tonteoIdeal   =   [0, 0, 0, 0, 0];
    
        for(let i = 0; i < precios.length; i++) {
            const x     =   precios[i];
            for(let j = 0; j < x.length; j++) {
                const input     =   data['plan_ideal_'+(i+1)];
                const total     =   (input * x[j]);
                usePage2.moveTo(cordenadaX[j], coordenadaY[i]);
                usePage2.drawText(`${total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, {
                    size: 9,
                    font: await document.embedFont(StandardFonts.HelveticaOblique),
                });
                tonteoIdeal[j]    +=  total;
            }
        }
        for(let i = 0; i < tonteoIdeal.length; i++) {
            usePage2.moveTo(cordenadaX[i], 310);
            usePage2.drawText(`${(tonteoIdeal[i]).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, {
                size: 9,
                font: await document.embedFont(StandardFonts.HelveticaOblique),
                color: rgb(1, 1, 1) // Color blanco
            });
        }
        for(let i = 0; i < tonteoIdeal.length; i++) {
            usePage2.moveTo(cordenadaX[i], 292);
            usePage2.drawText(`${(tonteoIdeal[i]/2).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, {
                size: 9,
                font: await document.embedFont(StandardFonts.HelveticaOblique),
                color: rgb(1, 1, 1) // Color blanco
            });
        }
    }
    else {
        if(data['plan-inicial-remove'] == 1)
            document.removePage(2);
        else 
            document.removePage(3);
    }

    /* pagina 3 */
    if(data['plan-especial-remove'] == 0) {
        const usePage3 = document.getPage(4); // Usar la página anterior o ajustar según tus necesidades
        usePage3.moveTo(158, 782);
        usePage3.drawText(data.nombre, {
            size: 9
        });
        usePage3.moveTo(144, 767);
        usePage3.drawText(getStringDate(), {
            size: 9
        });
        usePage3.moveTo(145, 750);
        usePage3.drawText(data.agente, {
            size: 9
        });
    
        let coordenadaPoblacion = [366, 351, 336, 321];
    
        for(let i = 1; i <= 4; i++) {
            usePage3.moveTo(182, coordenadaPoblacion[i-1]);
            usePage3.drawText(''+data['plan_especial_'+i], {
                size: 9
            });
        }
    
        let precios     =   [
            [270, 295, 375, 405, 466, 495],
            [295, 328, 399, 453, 520, 695],
            [490, 525, 596, 698, 777, 898],
            [615, 666, 770, 824, 888, 966]
        ];
        let cordenadaX = [243, 293, 347, 400, 453, 512];
        let coordenadaY = [365, 350, 335, 320];
    
        let tonteoIdeal   =   [0, 0, 0, 0, 0, 0];
    
        for(let i = 0; i < precios.length; i++) {
            const x     =   precios[i];
            for(let j = 0; j < x.length; j++) {
                const input     =   data['plan_especial_'+(i+1)];
                const total     =   (input * x[j]);
                usePage3.moveTo(cordenadaX[j], coordenadaY[i]);
                usePage3.drawText(`${total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, {
                    size: 9,
                    font: await document.embedFont(StandardFonts.HelveticaOblique),
                });
                tonteoIdeal[j]    +=  total;
            }
        }
        for(let i = 0; i < tonteoIdeal.length; i++) {
            usePage3.moveTo(cordenadaX[i], 297);
            usePage3.drawText(`${(tonteoIdeal[i]).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, {
                size: 9,
                font: await document.embedFont(StandardFonts.HelveticaOblique),
                color: rgb(1, 1, 1) // Color blanco
            });
        }
        for(let i = 0; i < tonteoIdeal.length; i++) {
            usePage3.moveTo(cordenadaX[i], 280);
            usePage3.drawText(`${(tonteoIdeal[i]/2).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, {
                size: 9,
                font: await document.embedFont(StandardFonts.HelveticaOblique),
                color: rgb(1, 1, 1) // Color blanco
            });
        }
        for(let i = 0; i < tonteoIdeal.length; i++) {
            usePage3.moveTo(cordenadaX[i], 262);
            usePage3.drawText(`${(tonteoIdeal[i]/3).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, {
                size: 9,
                font: await document.embedFont(StandardFonts.HelveticaOblique),
                color: rgb(1, 1, 1) // Color blanco
            });
        }
    }
    else {
        if(data['plan-inicial-remove'] == 1 && data['plan-ideal-remove'] == 0)
            document.removePage(3);
        else if(data['plan-inicial-remove'] == 0 && data['plan-ideal-remove'] == 1)
            document.removePage(3);
        else {
            document.removePage(4);
        }
    }
    
    document.setTitle(getStringDate() + " Cotizacion en linea cotizador - TDEC");
    writeFileSync("./uploads/propuesta_economica_2.pdf", await document.save());
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

// Endpoint para cargar archivos
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ filePath: `./uploads/${req.file.filename}` });
});

// ws.initialize();