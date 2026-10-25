import { Link } from 'react-router-dom';
import LegalPage, { BusinessIdentity, ContactUsLink } from './LegalLayout';
import { useShopDetails } from '../../context/ShopDetails';

// Terms for UK consumers. A starting point: have it checked before relying on it.
const Terms = () => {
  const shop = useShopDetails();
  return (
    <LegalPage title='Terms & conditions'>
      <p>
        These terms apply when you buy from {shop.name} on this website. Please read them before you order. They don&apos;t affect your
        legal rights as a consumer.
      </p>

      <h2>1. About us</h2>
      <BusinessIdentity />

      <h2>2. Your account</h2>
      <p>
        You can shop with an account. Keep your password private and tell us if you think someone else has used your account. We may suspend
        an account that is used to break these terms or the law.
      </p>

      <h2>3. Products</h2>
      <p>
        We describe each item, including its size and colour, as accurately as we can. Colours can look slightly different on different
        screens. Brand names and trade marks belong to their owners; we are not connected with those brands unless we say so.
      </p>

      <h2>4. Prices and payment</h2>
      <ul>
        <li>Prices are in pounds sterling and include any VAT that applies.</li>
        <li>Delivery charges are shown in your bag and at checkout before you pay.</li>
        <li>Payments are processed securely by our payment provider, Stripe. We never see or store your full card details.</li>
        <li>
          If we have made an obvious mistake with a price, we&apos;ll contact you before sending your order and you can choose to continue
          at the correct price or cancel for a full refund.
        </li>
      </ul>

      <h2>5. Your order</h2>
      <p>
        You place an order by paying at checkout. Our contract with you starts when we email you to confirm your order. If we can&apos;t
        supply an item after all, for example because it has sold out, we&apos;ll tell you and refund you in full for it.
      </p>

      <h2>6. Delivery</h2>
      <p>
        We deliver within the UK. Costs and timings are on our <Link to='/delivery'>Delivery</Link> page. Items are our responsibility until
        they are delivered to you, and become yours once you have paid for them.
      </p>

      <h2>7. Cancelling and returns</h2>
      <p>
        You can cancel within 14 days of receiving your order, and we accept returns of unused items within 30 days. See{' '}
        <Link to='/returns'>Returns &amp; refunds</Link> for how it works.
      </p>

      <h2>8. Faulty items</h2>
      <p>
        We must supply items that are as described, of satisfactory quality and fit for purpose. If an item is faulty, you have rights under
        the Consumer Rights Act 2015, including a full refund if you reject it within 30 days of delivery. See{' '}
        <Link to='/returns'>Returns &amp; refunds</Link>.
      </p>

      <h2>9. Our responsibility to you</h2>
      <p>
        If we break these terms or are negligent, we are responsible for loss you suffer that was a foreseeable result of that. We are not
        responsible for loss that was not foreseeable. We do not exclude or limit our liability where it would be unlawful to do so,
        including for death or personal injury caused by our negligence, for fraud, or for breaching your legal rights in relation to the
        products. We sell to consumers for personal use only, so we are not responsible for business losses.
      </p>

      <h2>10. Using this website</h2>
      <p>
        Please don&apos;t misuse the website, for example by trying to get into parts of it you don&apos;t have access to or by interfering
        with how it works. The website&apos;s content belongs to us or to the people who license it to us.
      </p>

      <h2>11. Problems and complaints</h2>
      <p>
        If you have a problem, please <ContactUsLink /> first and we&apos;ll do our best to put it right. How we use your personal
        information is explained in our <Link to='/privacy'>Privacy policy</Link>.
      </p>

      <h2>12. Changes and the law</h2>
      <p>
        We may update these terms from time to time; the version on the website when you order is the one that applies to that order. These
        terms are governed by the law of England and Wales. You can bring legal proceedings in the courts of England and Wales, or, if you
        live in Scotland or Northern Ireland, in the courts there.
      </p>
    </LegalPage>
  );
};

export default Terms;
