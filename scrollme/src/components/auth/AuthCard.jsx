import styled from 'styled-components';
import Logo from '../Logo';

// The narrow (portrait) card used by the sign-in, sign-up and code pages.
const Container = styled.div`
  width: 100vw;
  min-height: 100vh;
  padding: 24px 16px;
  box-sizing: border-box;
  background:
    linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)),
    url('https://images.pexels.com/photos/6984650/pexels-photo-6984650.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940') center;
  background-size: cover;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Wrapper = styled.div`
  width: 100%;
  max-width: 440px;
  padding: 28px 24px;
  box-sizing: border-box;
  background-color: white;
`;

export const Title = styled.h1`
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  line-height: 1;
  font-size: 40px;
`;

export const Intro = styled.p`
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.5;
  color: #444;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

// Label above the box, guidance (or the problem) under it.
export const Field = styled.div`
  margin-top: 18px;
  label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 600;
  }
  input {
    width: 100%;
    padding: 12px;
    /* 16px stops iPhones zooming in when the box is tapped. */
    font-size: 16px;
    border: 1px solid #bbb;
    border-radius: 4px;
    box-sizing: border-box;
  }
  input[aria-invalid='true'] {
    border: 2px solid #c53030;
  }
  input.code {
    font-size: 26px;
    letter-spacing: 0.4em;
    text-align: center;
  }
`;

export const Hint = styled.p`
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.45;
  color: ${({ $error, $ok }) => ($error ? '#c53030' : $ok ? '#276749' : '#555')};
  font-weight: ${({ $error }) => ($error ? 600 : 400)};
`;

export const Button = styled.button`
  width: 100%;
  margin-top: 20px;
  border: none;
  padding: 15px 20px;
  background-color: var(--accent);
  color: white;
  font-size: 15px;
  letter-spacing: 0.06em;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

export const TextButton = styled.button`
  align-self: flex-start;
  margin-top: 14px;
  padding: 0;
  background: none;
  border: none;
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
  color: inherit;
  &:disabled {
    color: #888;
    text-decoration: none;
    cursor: default;
  }
`;

export const ErrorText = styled.p`
  margin-top: 14px;
  color: #c53030;
  font-size: 14px;
  font-weight: 600;
`;

export const Status = styled.p`
  margin-top: 14px;
  color: #276749;
  font-size: 14px;
`;

const AuthCard = ({ children }) => (
  <Container>
    <Wrapper>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', marginBottom: 16 }}>
        <Logo />
      </div>
      {children}
    </Wrapper>
  </Container>
);

export default AuthCard;
