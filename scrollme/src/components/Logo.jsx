import { Link } from 'react-router-dom';
import styled from 'styled-components';

// The wordmark stays on one line and shrinks to fit narrow phones.
const LogoWrapper = styled.h1`
  font-size: ${({ size }) => `min(${size || '2rem'}, 8.5vw)`};
  white-space: nowrap;
`;

const Logo = ({ size }) => {
  return (
    <LogoWrapper size={size}>
      <Link to='/'>
        GET IT <span style={{ color: 'teal' }}>SOURCED</span>
      </Link>
    </LogoWrapper>
  );
};

export default Logo;
