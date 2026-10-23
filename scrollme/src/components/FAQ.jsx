import { useState } from 'react';
import styled from 'styled-components';
import { HiChevronDown } from 'react-icons/hi2';
import SectionHeading from './home/SectionHeading';

const faqData = [
  {
    question: 'What is Get It Sourced?',
    answer:
      'Get It Sourced is an online store where we source fashion, footwear and accessories for you, so you can shop a wide range of products from the comfort of your home.',
  },
  {
    question: 'Where do you deliver, and how much does it cost?',
    answer:
      'We deliver across the UK, and delivery is free on every order. We do not ship outside the UK at the moment. Standard delivery takes 3–5 working days.',
  },
  {
    question: 'How do I track my order?',
    answer:
      "Sign in and open 'Account'. Your order history lists every order; open one to see its status, tracking number and full history.",
  },
  {
    question: 'What payment methods are accepted?',
    answer:
      'We accept credit and debit cards (Visa, Mastercard, American Express and more), Apple Pay, Google Pay, PayPal and Klarna. Payments are processed securely by our payment provider; we never store your card details.',
  },
  {
    question: "What if I'm not happy with my order?",
    answer:
      'You have 30 days from delivery to return an item, as long as it is unused and in its original condition. Contact us with your order number to arrange a return.',
  },
];

const List = styled.div`
  max-width: 760px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Item = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.08);
`;

const Question = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px;
  background: none;
  border: none;
  text-align: left;
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
  color: var(--ink);
  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
    transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  }
`;

const Answer = styled.p`
  padding: 0 24px 22px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--muted);
`;

const FAQ = () => {
  const [open, setOpen] = useState(null);

  return (
    <section id='faq' aria-labelledby='faq-title'>
      <SectionHeading id='faq-title'>FAQ</SectionHeading>
      <List>
        {faqData.map((item, index) => (
          <Item key={item.question}>
            <Question
              type='button'
              $open={open === index}
              aria-expanded={open === index}
              aria-controls={`faq-${index}`}
              onClick={() => setOpen(open === index ? null : index)}
            >
              {item.question}
              <HiChevronDown size={22} aria-hidden='true' />
            </Question>
            {open === index && <Answer id={`faq-${index}`}>{item.answer}</Answer>}
          </Item>
        ))}
      </List>
    </section>
  );
};

export default FAQ;
