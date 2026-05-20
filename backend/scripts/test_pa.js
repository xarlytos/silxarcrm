const cheerio = require('cheerio');
const fs = require('fs');

fetch('https://www.paginasamarillas.es/search/peluquer%C3%ADa%20canina/all-ma/all-pr/all-is/all-ci/all-ba/all-pu/all-nc/1', {
  headers: { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
  }
})
.then(r => r.text())
.then(html => {
  fs.writeFileSync('/tmp/pa_test.html', html);
  const $ = cheerio.load(html);
  
  // Buscar cualquier elemento que contenga 'telefono' o 'direccion' en clase o id
  const allClasses = new Set();
  $('*').each((i, el) => {
    const cls = $(el).attr('class');
    if (cls) cls.split(' ').forEach(c => allClasses.add(c));
  });
  
  // Buscar clases que contengan palabras clave
  const keywords = ['resultado', 'item', 'listing', 'card', 'telefono', 'direccion', 'nombre', 'empresa', 'negocio'];
  for (const kw of keywords) {
    const matches = [...allClasses].filter(c => c.toLowerCase().includes(kw));
    if (matches.length > 0) {
      console.log('Clases con "' + kw + '":', matches.slice(0, 5).join(', '));
    }
  }
  
  // Buscar h2, h3 con nombres de negocios
  console.log('\n--- Headers ---');
  $('h2, h3').slice(0, 5).each((i, el) => {
    console.log($(el).text().trim().substring(0, 80));
  });
  
  // Buscar elementos con texto de telefono
  console.log('\n--- Buscando telefonos ---');
  let phoneCount = 0;
  $('body').find('*').each((i, el) => {
    const text = $(el).text();
    if (/\d{3}\s+\d{2}\s+\d{2}\s+\d{2}/.test(text) && $(el).children().length === 0) {
      phoneCount++;
      if (phoneCount <= 3) {
        console.log('Tel:', text.trim().substring(0, 50));
      }
    }
  });
  console.log('Total elementos con telefono:', phoneCount);
})
.catch(e => console.error('Error:', e.message));
