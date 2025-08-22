import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FeaturesRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the landing page with features section
    navigate('/#features', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting to features...</p>
    </div>
  );
};

export default FeaturesRedirect;