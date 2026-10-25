import { Link } from 'react-router-dom';
import LegalPage, { Box, ContactUsLink, addressLines } from './LegalLayout';
import { useShopDetails } from '../../context/ShopDetails';

// Returns, cancellation (Consumer Contracts Regulations 2013) and faulty goods
// (Consumer Rights Act 2015). Have the wording checked before relying on it.
const Returns = () => {
  const shop = useShopDetails();
  const freeReturns = shop.returnPostage === 'free';
  const to = [shop.legalName || shop.name, ...addressLines(shop.address), shop.email].filter(Boolean).join(', ');
  return (
    <LegalPage title='Returns & refunds'>
      <p>If something isn&apos;t right, you can send it back. Here is how returns and refunds work.</p>

      <h2>30-day returns</h2>
      <p>
        You can return items within <strong>30 days of delivery</strong> for a refund, as long as they are unused and unworn, in their
        original condition, with any tags and packaging.
      </p>

      <h2>Your legal right to cancel</h2>
      <p>
        UK law also lets you cancel your order for any reason within <strong>14 days of receiving it</strong> (the Consumer Contracts
        Regulations). You then have a further 14 days to send the items back. Our 30-day returns give you longer than this.
      </p>

      <h2>How to return an item</h2>
      <ol>
        <li>
          <ContactUsLink>Contact us</ContactUsLink>
          {shop.email && (
            <>
              {' '}
              or email <a href={`mailto:${shop.email}`}>{shop.email}</a>
            </>
          )}{' '}
          within 30 days of delivery with your order number and the items you are returning.
        </li>
        <li>We&apos;ll reply with the returns address and anything else you need.</li>
        <li>Send the items back within 14 days of telling us. Use a tracked service and keep your proof of postage.</li>
      </ol>
      <p>
        {freeReturns
          ? "Returns are free: we'll tell you how to send your parcel back at no cost."
          : 'You pay the cost of sending items back, unless they are faulty or we sent you the wrong item.'}
      </p>

      <h2>Refunds</h2>
      <ul>
        <li>
          We refund you to the payment method you used, within 14 days of receiving the items back (or of you showing us proof that you have
          sent them, if that is sooner).
        </li>
        <li>
          If you cancel a whole order within the 14-day cancellation period, we also refund the standard delivery charge you paid. If you
          chose a more expensive delivery option, we refund the cost of standard delivery.
        </li>
        <li>
          We may reduce a refund if an item has been worn or handled more than you would need to in a shop to try it, for example if it is
          damaged, marked or has had its tags removed.
        </li>
      </ul>

      <h2>Items we can&apos;t take back</h2>
      <p>
        For hygiene reasons, fragrances and other sealed items can&apos;t be returned once the seal or wrapping has been opened, unless they
        are faulty.
      </p>

      <h2>Faulty or wrong items</h2>
      <p>
        If an item is faulty, not as described or not what you ordered, <ContactUsLink /> with your order number and a photo. Under the
        Consumer Rights Act 2015 you can reject a faulty item within 30 days of delivery for a full refund; after that we will repair or
        replace it, or refund you if that isn&apos;t possible. We pay the return postage for faulty and wrong items. These rights are in
        addition to our returns policy and are not affected by it.
      </p>

      <h2>Cancelling an order before it ships</h2>
      <p>
        You can cancel an order that hasn&apos;t been paid for from its page in <Link to='/account'>your account</Link>. For an order you
        have paid for, <ContactUsLink /> as soon as possible and we&apos;ll cancel it and refund you if it hasn&apos;t been sent yet.
      </p>

      <h2>Cancellation form</h2>
      <p>
        You can tell us you are cancelling in any clear way, for example by email. You can also copy this form, but you don&apos;t have to.
      </p>
      <Box>
        <p>To: {to || `${shop.name} (see our contact details on the Contact us page)`}</p>
        <p>I hereby give notice that I cancel my contract of sale of the following goods: [items]</p>
        <p>Ordered on [date] / received on [date]</p>
        <p>Order number: [order number]</p>
        <p>Name: [your name]</p>
        <p>Address: [your address]</p>
        <p>Date: [date]</p>
      </Box>
    </LegalPage>
  );
};

export default Returns;
