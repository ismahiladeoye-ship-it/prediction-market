import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { sendContactMessageAPI } from '../services/site/siteService';
import { getErrorMessage } from '../api/client';
import { useShopDetails } from '../context/ShopDetails';

const Container = styled.main`
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 20px 64px;
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(44px, 11vw, 80px);
  line-height: 1;
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const Intro = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: #444;
  margin-bottom: 24px;
  a {
    text-decoration: underline;
  }
`;

const Kinds = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 22px;
  label {
    border: 1.5px solid #ddd;
    border-radius: 14px;
    padding: 14px;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  label:has(input:checked) {
    border-color: var(--ink);
    background: #f5f5f5;
  }
  small {
    display: block;
    font-weight: 400;
    color: #666;
    margin-top: 2px;
  }
  input {
    margin-top: 4px;
    accent-color: var(--ink);
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Form = styled.form`
  display: grid;
  gap: 16px;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  input,
  textarea {
    font: inherit;
    font-weight: 400;
    font-size: 16px;
    padding: 12px 14px;
    border: 1.5px solid #ddd;
    border-radius: 12px;
    width: 100%;
    background: white;
  }
  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--ink);
  }
  textarea {
    resize: vertical;
    min-height: 140px;
  }
  span.optional {
    font-weight: 400;
    color: #777;
  }
`;

// Hidden from people; bots that fill it in are ignored by the API.
const Trap = styled.div`
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
`;

const Submit = styled.button`
  justify-self: start;
  background: var(--ink);
  color: white;
  border: none;
  border-radius: 14px;
  height: 52px;
  padding: 0 32px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const ErrorText = styled.p`
  color: #b00020;
  font-size: 14px;
`;

const Done = styled.div`
  border: 1.5px solid var(--ink);
  border-radius: 16px;
  padding: 22px;
  h2 {
    font-size: 20px;
    margin-bottom: 8px;
  }
  button {
    margin-top: 14px;
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font: inherit;
  }
`;

const ContactUs = () => {
  const shop = useShopDetails();
  const user = useSelector((state) => state.user);
  const [params] = useSearchParams();
  const blank = () => ({
    kind: params.get('type') === 'sourcing' ? 'sourcing' : 'general',
    name: user?.isAuthenticated ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '',
    email: user?.isAuthenticated ? user.email || '' : '',
    phone: '',
    orderNumber: '',
    item: '',
    size: '',
    budget: '',
    message: '',
    website: '',
  });
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const sourcing = form.kind === 'sourcing';

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { kind, name, email, phone, message, website } = form;
      const extra = sourcing ? { item: form.item, size: form.size, budget: form.budget } : { orderNumber: form.orderNumber };
      setSent((await sendContactMessageAPI({ kind, name, email, phone, message, website, ...extra })).message);
    } catch (err) {
      setError(getErrorMessage(err, 'Your message could not be sent. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Container>
        <Title>Contact us</Title>
        <Done role='status'>
          <h2>Message sent</h2>
          <p>{sent}</p>
          <button
            type='button'
            onClick={() => {
              setForm(blank());
              setSent('');
            }}
          >
            Send another message
          </button>
        </Done>
      </Container>
    );
  }

  return (
    <Container>
      <Title>Contact us</Title>
      <Intro>
        Questions about an order, sizing or returns, or a piece you want us to find: send us a message and we&apos;ll reply by email
        {shop.email && (
          <>
            . You can also email <a href={`mailto:${shop.email}`}>{shop.email}</a>
          </>
        )}
        .
      </Intro>

      <Form onSubmit={submit}>
        <Kinds role='radiogroup' aria-label='What can we help with?'>
          <label>
            <input type='radio' name='kind' value='general' checked={!sourcing} onChange={change} />
            <span>
              Ask a question
              <small>Orders, sizing, delivery, returns</small>
            </span>
          </label>
          <label>
            <input type='radio' name='kind' value='sourcing' checked={sourcing} onChange={change} />
            <span>
              Find me an item
              <small>Tell us what you want and we&apos;ll source it</small>
            </span>
          </label>
        </Kinds>

        <Row>
          <Field>
            Name
            <input name='name' value={form.name} onChange={change} required maxLength={100} autoComplete='name' />
          </Field>
          <Field>
            Email
            <input type='email' name='email' value={form.email} onChange={change} required maxLength={254} autoComplete='email' />
          </Field>
        </Row>

        {sourcing ? (
          <>
            <Field>
              What are you looking for?
              <input
                name='item'
                value={form.item}
                onChange={change}
                required
                maxLength={200}
                placeholder='e.g. Essentials hoodie in black'
              />
            </Field>
            <Row>
              <Field>
                <span>
                  Size <span className='optional'>(optional)</span>
                </span>
                <input name='size' value={form.size} onChange={change} maxLength={40} placeholder='e.g. L or UK 9' />
              </Field>
              <Field>
                <span>
                  Budget <span className='optional'>(optional)</span>
                </span>
                <input name='budget' value={form.budget} onChange={change} maxLength={40} placeholder='e.g. £120' />
              </Field>
            </Row>
          </>
        ) : (
          <Field>
            <span>
              Order number <span className='optional'>(if it&apos;s about an order)</span>
            </span>
            <input name='orderNumber' value={form.orderNumber} onChange={change} maxLength={40} placeholder='GIS-…' />
          </Field>
        )}

        <Field>
          <span>
            Phone <span className='optional'>(optional)</span>
          </span>
          <input type='tel' name='phone' value={form.phone} onChange={change} maxLength={30} autoComplete='tel' />
        </Field>

        <Field>
          {sourcing ? 'Any details (colour, condition, when you need it)' : 'Your message'}
          <textarea name='message' value={form.message} onChange={change} required minLength={10} maxLength={5000} />
        </Field>

        <Trap aria-hidden='true'>
          <label>
            Website
            <input name='website' value={form.website} onChange={change} tabIndex={-1} autoComplete='off' />
          </label>
        </Trap>

        {error && <ErrorText role='alert'>{error}</ErrorText>}
        <Submit type='submit' disabled={busy}>
          {busy ? 'Sending…' : sourcing ? 'Send request' : 'Send message'}
        </Submit>
      </Form>
    </Container>
  );
};

export default ContactUs;
