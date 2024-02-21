const { degrees, PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { writeFileSync, readFileSync } = require("fs");
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer  = require('multer');
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express()
const port = 7774;

let whatsapp;
let qr_svg = '';
let whatsappInfo    =   null;

var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
        user: "contacto@conceptodigital.org",
        pass: "hmiwuhasvhpfsmlv"
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

app.use('/pdf', express.static('pdf'));
app.post('/generar-cotizacion', async (req, res) => {
    const data  =   req.body;
    createPDF(data[1], data[2]).catch((err) => console.log(err));

    let mailInfo    =   reemplazarVariables(data[3].body, data[0]);
    var mailOptions = {
        from: 'TuDrEnCasa Cotización <contacto@conceptodigital.org>',
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
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log('Error al enviar el correo: ', error);
            return res.sendStatus(500);
        } else {
            console.log("Enviado correctamente al correo");
            const agentNumero   =   '58'+data[0].agentPhone;
            if(agentNumero == '584143027250' || agentNumero == '584245718777' || agentNumero == '584142073145' || agentNumero == '584241764348' || agentNumero == '584120208119') {
                setTimeout(() => {
                    enviarMensaje(data[0].agentPhone+"@c.us", 'Estimado cliente '+data[0].agent+' Un placer saludarle, mi nombre es Christopher Reyes del Equipo de Tu Dr. En Casa 👨🏻‍⚕️🏡 Hemos notado que recientemente ha solicitado una cotización: ¿Presenta alguna pregunta o necesita ayuda para concluir su compra? Quedo a su disposición y atento a cualquier consulta que pueda tener.');
                }, 5000);
                setTimeout(() => {
                    enviarMensaje(data[0].agentPhone+"@c.us", "Estimado cliente "+data[0].agent+" Un placer saludarle, mi nombre es Christopher Reyes del Equipo de Tu Dr. En Casa 👨🏻‍⚕️🏡 Hemos notado que está próximo a vencerse la fecha de vigencia de la cotización emitida para usted, estamos comprometidos en ofrecer un servicio de excelencia para su tranquilidad. Le recordamos que ofrecemos planes diseñados a la medida, en caso que usted requiera algún ajuste. Estamos a su disposición.");
                }, 1 * 60 * 1000);
                setTimeout(() => {
                    enviarVideo(data[0].agentPhone+"@c.us")
                }, 2 * 60 * 1000)
                setTimeout(() => {
                    enviarImagen(data[0].agentPhone+"@c.us")
                }, 3 * 60 * 1000)
            }
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

function iniciarWhatsapp() {
    // whatsapp = new Client({
    //     puppeteer: {
    //         executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    //     }
    // });
    whatsapp = new Client({
        puppeteer: {
            executablePath: '/usr/bin/chromium-browser',
            headless: true,
            args: ['--no-sandbox']
        }
    });
  
    whatsapp.on('qr', (qr) => {
      qrcode.toString(qr, {type: 'svg', scale: 1}, function (err, svg) {
            if (err) throw err
            qr_svg = svg.replace('<svg', '<svg width="200" height="200"');
        });
    });
  
    whatsapp.on('ready', () => {
        console.log('Whatsapp Api is ready!');
        whatsappInfo    =   whatsapp.info;
    });

    whatsapp.on('message', async (message) => {
        if (message.body === '!ping') {
            await message.reply('pong');
        }
    });
     
  
    whatsapp.initialize();
}


app.get('/qr', (req, res) => {
    if (qr_svg) {
        res.send(qr_svg);
    } else {
        res.send('No hay un código QR disponible en este momento.');
    }
});

app.get('/estado-sesion', (req, res) => {
    if (whatsappInfo != null) {
        let infoCliente = {
            sesionIniciada: true,
            numeroTelefono: whatsapp.info.wid.user
        };

        res.json(infoCliente);
    } else {
        res.json({ sesionIniciada: false });
    }
});

app.get('/cerrar-sesion', (req, res) => {
    if (whatsapp) {
        whatsapp.logout().then(() => {
            whatsapp = null;
            whatsappInfo = null;
            qr_svg = '';
            console.log("Whatsapp Api close!");
            iniciarWhatsapp();
            res.send("1");
        });
    } else {
        res.send("0");
    }
});

app.listen(port, () => {
    console.log(`Cotizador tu drencasa corriendo http://localhost:${port}/`)
})
iniciarWhatsapp();

// Enviar un mensaje de texto
function enviarMensaje(numero, mensaje) {
    whatsapp.sendMessage(numero, mensaje);
}
  
// Enviar un vídeo
function enviarVideo(numero) {
    fs.readFile("day3.mp4", (err, data) => {
        if (err) {
            console.error('No se pudo leer el archivo de vídeo:', err);
            return;
        }   
        const media = new MessageMedia('video/mp4', data.toString('base64'), 'video.mp4');
        whatsapp.sendMessage(numero, media).catch(err => console.error(err));
    });
}
// Enviar un vídeo
function enviarImagen(numero) {
    fs.readFile("day7.jpeg", (err, data) => {
        if (err) {
            console.error('No se pudo leer el archivo de vídeo:', err);
            return;
        }   
        const media = new MessageMedia('image/jpeg', data.toString('base64'), 'image.jpg');
        whatsapp.sendMessage(numero, media).catch(err => console.error(err));
    });
}

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