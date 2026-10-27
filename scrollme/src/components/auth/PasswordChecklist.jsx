import styled from 'styled-components';
import { HiCheckCircle, HiOutlineCheckCircle } from 'react-icons/hi2';
import { PASSWORD_RULES } from '../../utils/passwordPolicy';

const Rules = styled.ul`
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  font-size: 13px;
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    color: #666;
  }
  li[data-met='true'] {
    color: #276749;
  }
`;

// Read out by screen readers only.
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

// The password rules, each ticked green once the password meets it.
const PasswordChecklist = ({ id, password }) => (
  <Rules id={id} aria-label='Your password needs'>
    {PASSWORD_RULES.map((rule) => {
      const met = rule.test(password);
      return (
        <li key={rule.label} data-met={met}>
          {met ? <HiCheckCircle size={16} aria-hidden='true' /> : <HiOutlineCheckCircle size={16} aria-hidden='true' />}
          {rule.label}
          {met && <VisuallyHidden> (done)</VisuallyHidden>}
        </li>
      );
    })}
  </Rules>
);

export default PasswordChecklist;
