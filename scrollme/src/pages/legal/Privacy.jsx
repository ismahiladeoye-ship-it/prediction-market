import { Link } from 'react-router-dom';
import LegalPage, { BusinessIdentity, ContactUsLink } from './LegalLayout';
import { useShopDetails } from '../../context/ShopDetails';

// What the shop actually collects and why (UK GDPR). Keep this in step with the
// code: cookies, browser storage and the services listed here are the real ones.
const Privacy = () => {
  const shop = useShopDetails();
  return (
    <LegalPage title='Privacy policy'>
      <p>
        This explains what personal information {shop.name} collects when you use this website, why, and your rights. We only collect what
        we need to run the shop.
      </p>

      <h2>Who we are</h2>
      <p>
        {shop.legalName || shop.name} is the controller of your personal information. You can reach us using the details below about
        anything in this policy.
      </p>
      <BusinessIdentity />

      <h2>What we collect and why</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name, username, email address and password (stored only in scrambled, hashed form). We use
          these to run your account. If you sign in with Google, Google gives us your name and email address.
        </li>
        <li>
          <strong>Your orders:</strong> what you bought, the delivery name, address and phone number, your email address, and the payment
          status and reference. We use these to deliver your order, keep you updated and handle returns, and we keep order records because
          tax law requires it.
        </li>
        <li>
          <strong>Payments:</strong> card and wallet details are entered on Stripe&apos;s secure page and go straight to Stripe. We never
          see or store your full card details; Stripe tells us whether the payment worked.
        </li>
        <li>
          <strong>Messages you send us:</strong> what you write on the contact page, with your name, email address and anything else you add
          (such as a phone number, order number, or the item, size and budget for a sourcing request). We use these to answer you.
        </li>
        <li>
          <strong>Newsletter:</strong> your email address, only if you sign up. We use it to tell you about new drops and restocks. You can
          ask us to remove you at any time.
        </li>
        <li>
          <strong>Your bag and wishlist:</strong> the items you save, so they are there when you come back.
        </li>
        <li>
          <strong>Technical information:</strong> like every website, our servers receive your IP address and browser details when you
          visit. Our web server keeps short-lived logs that include IP addresses, and we use your IP address for a short time to block
          repeated attempts to guess passwords. We use these to keep the website working and secure.
        </li>
      </ul>

      <h2>Our legal reasons</h2>
      <ul>
        <li>To provide your account and your orders: because it is needed for our contract with you.</li>
        <li>To keep order and payment records: because the law requires it.</li>
        <li>To answer your messages and keep the website secure: our legitimate interest in running the shop properly.</li>
        <li>To send the newsletter: your consent, which you can withdraw at any time.</li>
      </ul>

      <h2>Cookies and storage on your device</h2>
      <p>
        We only use cookies that are needed for the website to work, so we don&apos;t ask for consent for them. We don&apos;t use
        advertising or analytics cookies.
      </p>
      <ul>
        <li>
          <strong>accessToken</strong> and <strong>refreshToken</strong>: keep you signed in (for 15 minutes and 7 days, renewed while you
          use the site).
        </li>
        <li>
          <strong>mfaPending</strong>: for shop staff only, remembers a sign-in for 5 minutes while they enter their two-step code.
        </li>
        <li>
          Your browser&apos;s local storage keeps your wishlist and basic profile (your name, email address and whether you are signed in)
          so pages load straight away.
        </li>
      </ul>
      <p>Stripe&apos;s payment page sets its own cookies, described in Stripe&apos;s privacy policy.</p>

      <h2>Who we share it with</h2>
      <p>We don&apos;t sell your personal information. We share it only with services that help us run the shop:</p>
      <ul>
        <li>Stripe, which processes payments.</li>
        <li>The company that hosts our website and database, and our email provider, which sends order and account emails.</li>
        <li>Delivery companies, which receive your name, address and phone number to deliver your order.</li>
        <li>
          Google: the website&apos;s fonts load from Google Fonts, so your browser connects to Google, which can see your IP address. If you
          sign in with Google, Google handles that sign-in.
        </li>
        <li>Pexels, which hosts some of the photos on our pages, so your browser connects to it when they load.</li>
        <li>The police, courts or regulators, if the law requires it.</li>
      </ul>
      <p>
        Some of these services may process information outside the UK. Where they do, they protect it with the safeguards UK law requires,
        such as approved contract terms.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account: until you ask us to close it.</li>
        <li>Order records: six years after the order, as tax law requires.</li>
        <li>Messages: until your enquiry is dealt with and for up to two years afterwards, in case you get back in touch.</li>
        <li>Newsletter: until you unsubscribe.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can ask us for a copy of your personal information, to correct it, to delete it, to limit how we use it, to object to how we use
        it, or to send it to you or another company in a portable format. Where we rely on your consent, you can withdraw it at any time. To
        use any of these rights, <ContactUsLink />. We&apos;ll reply within one month.
      </p>
      <p>
        If you are unhappy with how we have handled your information, please tell us. You can also complain to the Information
        Commissioner&apos;s Office (ICO) at <a href='https://ico.org.uk/make-a-complaint/'>ico.org.uk</a> or on 0303 123 1113.
      </p>

      <h2>Keeping it safe</h2>
      <p>
        The website uses an encrypted connection, passwords are stored hashed, and shop staff sign in with a two-step code. Only staff who
        need your information to run the shop can see it.
      </p>

      <h2>Changes</h2>
      <p>
        We&apos;ll update this policy if what we do changes; the date at the top shows the latest version. See also our{' '}
        <Link to='/terms'>Terms &amp; conditions</Link>.
      </p>
    </LegalPage>
  );
};

export default Privacy;
