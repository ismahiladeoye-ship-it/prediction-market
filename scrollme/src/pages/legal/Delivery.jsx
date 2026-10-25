import { Link } from 'react-router-dom';
import LegalPage, { ContactUsLink } from './LegalLayout';
import { useShopDetails } from '../../context/ShopDetails';
import { formatPrice } from '../../utils/format';

const COUNTRY_NAMES = { GB: 'the United Kingdom' };

// Prices come from the API settings (SHIPPING_STANDARD etc.), so this page
// always matches what checkout charges.
const Delivery = () => {
  const shop = useShopDetails();
  const d = shop.delivery;
  const countries = d ? d.countries.map((c) => COUNTRY_NAMES[c] || c).join(', ') : 'the United Kingdom';
  return (
    <LegalPage title='Delivery'>
      <h2>Where we deliver</h2>
      <p>We deliver to addresses in {countries}. Checkout only accepts addresses we can deliver to.</p>

      <h2>Cost</h2>
      {d ? (
        <ul>
          <li>
            Standard delivery: {d.standard > 0 ? formatPrice(d.standard) : 'free'}
            {d.freeOver && d.standard > 0 && <>, or free on orders of {formatPrice(d.freeOver)} or more</>}.
          </li>
          {d.express !== null && <li>Express delivery: {formatPrice(d.express)}.</li>}
        </ul>
      ) : (
        <p>The delivery charge is shown in your bag before you pay.</p>
      )}
      <p>The delivery charge for your order is always shown in your bag and at checkout before you pay.</p>

      <h2>How long it takes</h2>
      <p>Standard delivery usually takes {shop.deliveryEstimate} after your order is confirmed.</p>

      <h2>Tracking</h2>
      <p>
        We email you when your order is on its way, with a tracking number when there is one. You can also follow your order under{' '}
        <Link to='/account'>Account</Link>.
      </p>

      <h2>If something goes wrong</h2>
      <p>
        If your order hasn&apos;t arrived when expected, or arrives damaged, <ContactUsLink /> with your order number and we&apos;ll sort it
        out. Items are our responsibility until they are delivered to you or to someone you asked us to deliver to.
      </p>

      <h2>Returns</h2>
      <p>
        See <Link to='/returns'>Returns &amp; refunds</Link>.
      </p>
    </LegalPage>
  );
};

export default Delivery;
