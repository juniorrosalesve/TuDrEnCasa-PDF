const { degrees, PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { writeFileSync, readFileSync } = require("fs");
const nodemailer = require('nodemailer');

const app = express()
const port = 7774;

const DEV   =   false;

const URL   =   (DEV ? 'http://127.0.0.1:7774/' : 'https://tudrencasa.conceptodigital.org/');

var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
        user: "noreplywebsiteall@gmail.com",
        pass: "yygkotgmnkfhpbdp"
    }
});

app.use(express.json());
app.use(express.urlencoded());

app.post('/generar-cotizacion', async (req, res) => {
    const data  =   req.body;
    console.log(data);
    res.sendStatus(200)
    createPDF(data).catch((err) => console.log(err));

    var xxxDate     =   new Date();
    let mailInfo    =   '<h4>Estimado(a) '+data.agent+'</h4>';
    mailInfo    +=  '<p>Adjuntamos al presente, propuesta económica para plan de salud Domiciliario, en Tu Dr. en Casa, estamos comprometidos en ofrecer un servicio de excelencia para su tranquilidad.</p>';
    mailInfo    +=  '<p style="font-weight: 700; font-style: italic;">Requisitos de Afiliación:</p>';
    mailInfo    +=  '<ul><li>Llenar el formato de afiliaciones</li><li>Copia de documento de identificación de los solicitantes.</li></ul>';
    mailInfo    +=  '<p>Enviar los requisitos a afiliaciones@tudrencasa.com</p>';
    mailInfo    +=  '<p style="font-style: italic;">Gracias por preferirnos.</p>';
    mailInfo    +=  '<p style="font-weight: 700; font-style: italic;">**Esta dirección de email es de no respuesta en caso de cualquier inquietud favor contactar nuestro Departamento Comercial**</p>'

    var mailOptions = {
        from: 'TuDrEnCasa Cotización <noreplywebsiteall@gmail.com>',
        to: [data.agentEmail, 'tudrencasa.v@gmail.com'],
        subject: 'Propuesta '+data.name+' / Agente '+data.agent,
        html: mailInfo,
        attachments: [
            { 
                filename: 'Propuesta '+data.name+' / '+data.agent+'.pdf',
                path: './pdf/cotizacion_new.pdf'
            }
        ]
    };
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            return res.sendStatus(500);
        } else {
            return res.sendStatus(200);
        }
    });
})

app.listen(port, () => {
    console.log(`Cotizador tu drencasa corriendo en el puerto ${port}`)
})

async function createPDF(data) {
    const document  =   await PDFDocument.load(readFileSync("./pdf/cotizacion.pdf"));
    const usePage   =   document.getPage(1);

    usePage.moveTo(165, 764);
    usePage.drawText(getStringDate(), {
        // font: courierBoldFont,
        size: 11,
    });
  
    usePage.moveTo(191, 702);
    usePage.drawText(data.name, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(122, 673);
    usePage.drawText(data.address, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(122, 645);
    usePage.drawText(data.phone, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(290, 645);
    usePage.drawText(data.email, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(123, 615);
    usePage.drawText(data.plan, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(122, 568);
    usePage.drawText(data.agent, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(122, 541);
    usePage.drawText(data.agentPhone, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(290, 541);
    usePage.drawText(data.agentEmail, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(288, 469);
    usePage.drawText("$"+(data.inicial).toFixed(2), {
        // font: courierBoldFont,
        size: 11,
    });
    usePage.moveTo(288, 444);
    usePage.drawText("$"+(data.inicial/2).toFixed(2), {
        // font: courierBoldFont,
        size: 11,
    });
    usePage.moveTo(288, 418);
    usePage.drawText("$"+(data.inicial/4).toFixed(2), {
        // font: courierBoldFont,
        size: 11,
    });


    usePage.moveTo(426, 469);
    usePage.drawText("$"+(data.ideal).toFixed(2), {
        // font: courierBoldFont,
        size: 11,
    });
    usePage.moveTo(426, 444);
    usePage.drawText("$"+(data.ideal/2).toFixed(2), {
        // font: courierBoldFont,
        size: 11,
    });
    usePage.moveTo(426, 418);
    usePage.drawText("$"+(data.ideal/4).toFixed(2), {
        // font: courierBoldFont,
        size: 11,
    });
  
    writeFileSync("./pdf/cotizacion_new.pdf", await document.save());
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