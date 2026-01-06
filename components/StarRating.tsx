import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  count: number;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ 
  count, 
  size = 16, 
  activeColor = "fill-guardian-yellow text-guardian-yellow", 
  inactiveColor = "text-gray-300" 
}) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          size={size}
          className={`${i <= count ? activeColor : inactiveColor}`}
        />
      ))}
    </div>
  );
};

export default StarRating;