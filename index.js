const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { writeFileSync, readFileSync } = require("fs");
const nodemailer = require('nodemailer');

const app = express()
const port = 7774;

var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
        user: "noreplywebsiteall@gmail.com",
        pass: "yygkotgmnkfhpbdp"
    }
});

app.use(bodyParser.urlencoded({extended:false}))

app.use(express.static(path.join(__dirname, 'src')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/index.html'));
});

app.post('/generar-cotizacion', async (req, res) => {
    const data  =   req.body;
    createPDF(data).catch((err) => console.log(err));

    var xxxDate     =   new Date();

    var mailOptions = {
        from: 'TuDrEnCasa Cotización <noreplywebsiteall@gmail.com>',
        to: [data.agentEmail, 'mariamgabrie@gmail.com'],
        subject: 'TuDrEnCasa Nueva Cotización '+xxxDate.getTime(),
        html: '<h1>Puede ver la cotización en el archivo adjunto.</h1>',
        attachments: [
            { 
                filename: 'nueva_cotzación'+xxxDate+'.pdf',
                path: './pdf/cotizacion_new.pdf'
            }
        ]
    };
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            res.send('<script>alert("Ocurrio un error, intente nuevamente.");location.href="https://tudrencasa.conceptodigital.org/"</script>');
        } else {
            res.send('<script>alert("Envíado correctamente!");location.href="https://tudrencasa.conceptodigital.org/"</script>');
        }
    });
    // return res.sendStatus(200);
})

app.listen(port, () => {
    console.log(`Cotizador tu drencasa corriendo en el puerto ${port}`)
})

async function createPDF(data) {
    const document = await PDFDocument.load(readFileSync("./pdf/cotizacion.pdf"));
  
    const courierBoldFont = await document.embedFont(StandardFonts.Courier);
    const usePage = document.getPage(1);
  
  
    usePage.moveTo(191, 739);
    usePage.drawText(data.name, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(122, 711);
    usePage.drawText(data.address, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(122, 682);
    usePage.drawText(data.phone, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(290, 682);
    usePage.drawText(data.email, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(122, 655);
    usePage.drawText(data.plan, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(122, 605);
    usePage.drawText(data.agent, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(122, 578);
    usePage.drawText(data.agentPhone, {
        // font: courierBoldFont,
        size: 11,
    });

    usePage.moveTo(290, 578);
    usePage.drawText(data.agentEmail, {
        // font: courierBoldFont,
        size: 11,
    });


    let actualPlan  =   0;
    for(var i = 0; i < planes.length; i++)
    {
        if(planes[i] == data.plan)
        {
            actualPlan = i;
            break;
        }
    }

    usePage.moveTo(288, 383);
    usePage.drawText("$"+(inicial[actualPlan]), {
        // font: courierBoldFont,
        size: 11,
    });
    usePage.moveTo(288, 357);
    usePage.drawText("$"+(inicial[actualPlan]/2), {
        // font: courierBoldFont,
        size: 11,
    });
    usePage.moveTo(288, 330);
    usePage.drawText("$"+(inicial[actualPlan]/4), {
        // font: courierBoldFont,
        size: 11,
    });


    usePage.moveTo(426, 383);
    usePage.drawText("$"+(ideal[actualPlan]), {
        // font: courierBoldFont,
        size: 11,
    });
    usePage.moveTo(426, 357);
    usePage.drawText("$"+(ideal[actualPlan]/2), {
        // font: courierBoldFont,
        size: 11,
    });
    usePage.moveTo(426, 330);
    usePage.drawText("$"+(ideal[actualPlan]/4), {
        // font: courierBoldFont,
        size: 11,
    });
  
    writeFileSync("./pdf/cotizacion_new.pdf", await document.save());
}


const planes    =   [
    "Tarifa anual 1 afiliado",
    "Tarifa anual 3 afiliados",
    "Tarifa anual 5 afiliados",
    "Tarifa anual 10 afiliados"
]
const inicial    =   [
    "195",
    "556",
    "878",
    "1658"
];
const ideal     =   [
    "295",
    "841",
    "1328",
    "2508"
];