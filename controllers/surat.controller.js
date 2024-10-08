const { response } = require('../helpers/response.formatter');
const { Bidang, Layanan, Layanan_surat, Layanan_form_num, Bkd_profile, User_info, sequelize } = require('../models');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const Validator = require("fastest-validator");
const v = new Validator();

module.exports = {

    getTemplate: async (req, res) => {
        try {
            let layanan = await Layanan.findOne({
                where: {
                    id: req.params.idlayanan
                },
                attributes: ['id', 'nama'],
                include: [
                    {
                        model: Bidang,
                        attributes: ['id', 'nama', 'pj', 'nip_pj'],
                    },
                    {
                        model: Layanan_surat
                    }
                ]
            });
            if (!layanan) {
                return res.status(404).send('Data tidak ditemukan');
            }

            res.status(200).json(response(200, 'success get data', layanan));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //untuk admin pdf
    getOutputSurat: async (req, res) => {
        try {
            let layanan = await Layanan.findOne({
                where: {
                    id: req.params.idlayanan
                },
                attributes: ['id', 'nama'],
                include: [
                    {
                        model: Bidang,
                        attributes: ['id', 'nama', 'pj', 'nip_pj'],
                    },
                    {
                        model: Layanan_surat,
                    }
                ]
            });
    
            if (!layanan) {
                return res.status(404).send('Data tidak ditemukan');
            }
    
            const idforminput = req.params.idforminput ?? null;
            let getdatauser;
    
            if (idforminput) {
                getdatauser = await Layanan_form_num.findOne({
                    where: {
                        id: idforminput
                    },
                    attributes: ['id', 'userinfo_id'],
                    include: [
                        {
                            model: User_info,
                            attributes: ['id', 'nama', 'alamat', 'nik', 'tempat_lahir', 'tgl_lahir'],
                        }
                    ]
                });
            }
    
            // Baca template HTML
            const templatePath = path.resolve(__dirname, '../views/template.html');
            let htmlContent = fs.readFileSync(templatePath, 'utf8');
    
            // Log template HTML untuk memastikan tidak ada kesalahan
            console.log(htmlContent);
    
            const tanggalInfo = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    
            // Replace placeholders with actual data
            htmlContent = htmlContent.replace('{{bidangName}}', layanan.Bidang.nama ?? '');
            htmlContent = htmlContent.replace('{{layananHeader}}', layanan.Layanan_surat?.header ?? '');
            htmlContent = htmlContent.replace('{{layananBody}}', layanan.Layanan_surat?.body ?? '');
            htmlContent = htmlContent.replace('{{layananFooter}}', layanan.Layanan_surat?.footer ?? '');
            htmlContent = htmlContent.replace('{{layanannomor}}', layanan.Layanan_surat?.nomor ?? '');
            htmlContent = htmlContent.replace('{{layananperihal}}', layanan.Layanan_surat?.perihal ?? '');
            htmlContent = htmlContent.replace('{{tanggalInfo}}', tanggalInfo);
            htmlContent = htmlContent.replace('{{nama}}', getdatauser?.User_info?.nama ?? 'Tidak Ditemukan');
            htmlContent = htmlContent.replace('{{nik}}', getdatauser?.User_info?.nik ?? 'Tidak Ditemukan');
            htmlContent = htmlContent.replace('{{tempat}}', getdatauser?.User_info?.tempat_lahir ?? 'Tidak Ditemukan');
            htmlContent = htmlContent.replace('{{tgl_lahir}}', getdatauser?.User_info?.tgl_lahir ? new Date(getdatauser?.User_info?.tgl_lahir).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '');
            htmlContent = htmlContent.replace('{{alamat}}', getdatauser?.User_info?.alamat ?? 'Tidak Ditemukan');
    
            // Jalankan Puppeteer dan buat PDF
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '1.16in',
                    right: '1.16in',
                    bottom: '1.16in',
                    left: '1.16in'
                }
            });
    
            await browser.close();
    
            const currentDate = new Date().toISOString().replace(/:/g, '-');
            const filename = `laporan-${currentDate}.pdf`;
    
            // Simpan buffer PDF untuk debugging
            fs.writeFileSync('output.pdf', pdfBuffer);
    
            // Set response headers
            res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-type', 'application/pdf');
            res.end(pdfBuffer);
    
        } catch (err) {
            console.error('Error generating PDF:', err);
            res.status(500).json({
                message: 'Internal Server Error',
                error: err.message
            });
        }
    },
    

    editTemplateSurat: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            // mendapatkan data layanan untuk pengecekan
            let layananGet = await Layanan.findOne({
                where: {
                    id: req.params.idlayanan
                },
                include: [
                    { model: Bidang },
                    { model: Layanan_surat }
                ],
                transaction
            });

            // cek apakah data layanan ada
            if (!layananGet) {
                await transaction.rollback();
                return res.status(404).json(response(404, 'layanan not found'));
            }

            // membuat schema untuk validasi
            const schema = {
                bidang_pj: { type: "string", optional: true },
                nip_pj: { type: "string", optional: true },
                header: { type: "string", optional: true },
                body: { type: "string", optional: true },
                footer: { type: "string", optional: true },
                nomor: { type: "string", optional: true },
                perihal: { type: "string", optional: true },
                catatan: { type: "string", optional: true },
                tembusan: { type: "string", optional: true },
            };

            // buat object layanan
            let layananUpdateObj = {
                bidang_pj: req.body.bidang_pj,
                nip_pj: req.body.nip_pj,
                header: req.body.header,
                body: req.body.body,
                footer: req.body.footer,
                nomor: req.body.nomor,
                perihal: req.body.perihal,
                catatan: req.body.catatan,
                tembusan: req.body.tembusan,
            };

            // validasi menggunakan module fastest-validator
            const validate = v.validate(layananUpdateObj, schema);
            if (validate.length > 0) {
                await transaction.rollback();
                return res.status(400).json(response(400, 'validation failed', validate));
            }

            // update bidang
            if (layananUpdateObj.bidang_pj) {
                await Bidang.update(
                    {
                        pj: layananUpdateObj.bidang_pj,
                        nip_pj: layananUpdateObj.nip_pj
                    },
                    {
                        where: { id: layananGet.Bidang.id },
                        transaction
                    });
            }

            // first or create layanansurat
            if (layananUpdateObj.header || layananUpdateObj.body || layananUpdateObj.footer || layananUpdateObj.nomor || layananUpdateObj.catatan || layananUpdateObj.tembusan || layananUpdateObj.perihal) {
                let layanansuratUpdateObj = {};
                if (layananUpdateObj.header) layanansuratUpdateObj.header = layananUpdateObj.header;
                if (layananUpdateObj.body) layanansuratUpdateObj.body = layananUpdateObj.body;
                if (layananUpdateObj.footer) layanansuratUpdateObj.footer = layananUpdateObj.footer;
                if (layananUpdateObj.nomor) layanansuratUpdateObj.nomor = layananUpdateObj.nomor;
                if (layananUpdateObj.catatan) layanansuratUpdateObj.catatan = layananUpdateObj.catatan;
                if (layananUpdateObj.tembusan) layanansuratUpdateObj.tembusan = layananUpdateObj.tembusan;
                if (layananUpdateObj.perihal) layanansuratUpdateObj.perihal = layananUpdateObj.perihal;

                let [layanansurat, created] = await Layanan_surat.findOrCreate({
                    where: { layanan_id: layananGet.id },
                    defaults: layanansuratUpdateObj,
                    transaction
                });

                if (!created) {
                    await Layanan_surat.update(layanansuratUpdateObj, {
                        where: { layanan_id: layananGet.id },
                        transaction
                    });
                }
            }

            await transaction.commit();

            res.status(200).json(response(200, 'success update layanan'));

        } catch (err) {
            await transaction.rollback();
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },
};
