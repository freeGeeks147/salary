/* Contact form ("Get in touch"). Messages go to https://indiacwg.com/api/contact.php,
   which emails them to the site owner; the owner's address is not on the page.
   Without JavaScript the form still posts and the server sends the visitor back
   here with ?contact=sent or ?contact=error. */
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var hi = (document.documentElement.lang || '').indexOf('hi') === 0;
  var MSG = {
    sending: ['Sending…', 'भेजा जा रहा है…'],
    sent: ['Thank you. Your message has been sent; we will reply by email.', 'धन्यवाद। आपका संदेश भेज दिया गया है; हम ईमेल से जवाब देंगे।'],
    email: ['Please check your email address.', 'कृपया अपना ईमेल पता जाँच लें।'],
    missing: ['Please fill in your name, email and message.', 'कृपया नाम, ईमेल और संदेश भरें।'],
    short: ['Please write a little more.', 'कृपया थोड़ा और लिखें।'],
    limit: ['Too many messages. Please try again in an hour.', 'बहुत ज़्यादा संदेश। कृपया एक घंटे बाद फिर कोशिश करें।'],
    error: ['Sorry, the message could not be sent. Please try again in a few minutes.', 'माफ़ कीजिए, संदेश नहीं भेजा जा सका। कृपया कुछ मिनट बाद फिर कोशिश करें।']
  };
  var status = form.querySelector('.contact-status');
  var button = form.querySelector('button[type="submit"]');
  function show(key) {
    var m = MSG[key] || MSG.error;
    status.textContent = m[hi ? 1 : 0];
    status.setAttribute('data-state', key);
  }
  if (form.elements.page) form.elements.page.value = location.pathname;
  var back = new URLSearchParams(location.search).get('contact');
  if (back) show(back === 'sent' ? 'sent' : 'error');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    button.disabled = true;
    show('sending');
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) { form.reset(); show('sent'); } else { show(d.error); }
      })
      .catch(function () { show('error'); })
      .then(function () { button.disabled = false; });
  });
})();
