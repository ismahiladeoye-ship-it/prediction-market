import styled from 'styled-components';

const Star = styled.span`
  color: #f5b301;
  font-size: 18px;
`;

// Five-star rating display (rounded down to the nearest half star).
export const renderStars = (rating) => {
  const stars = [];
  const value = Math.min(Math.max(Number(rating) || 0, 0), 5);
  const fullStars = Math.floor(value);
  const hasHalfStar = value % 1 >= 0.5;

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={`full-${i}`}>&#9733;</Star>); // Filled star
  }

  // Half star
  if (hasHalfStar) {
    stars.push(<Star key='half'>&#9734;</Star>);
  }

  // Empty stars
  for (let i = stars.length; i < 5; i++) {
    stars.push(<Star key={`empty-${i}`}>&#9734;</Star>); // Empty star
  }

  return stars;
};
