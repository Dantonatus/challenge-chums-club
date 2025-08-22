import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StickFightAnimation } from "@/components/landing/StickFightAnimation";
import { StorytellingSection } from "@/components/landing/StorytellingSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ArrowDown, Menu, X } from "lucide-react";

const NewIndex = () => {
  const [showAnimation, setShowAnimation] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setShowContent(true);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Character-Enhancement Challenge | Build Habits Together</title>
        <meta name="description" content="Form better habits with friends — playful, fair, accountable. Create groups, set challenges, log results, and keep a friendly ledger." />
        <link rel="canonical" href="/" />
      </Helmet>

      {/* Sticky Navigation */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="container py-4 flex items-center justify-between">
          <motion.div
            className="font-bold text-xl text-primary"
            whileHover={{ scale: 1.05 }}
          >
            Challenge
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors story-link"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors story-link"
            >
              Features
            </button>
          </nav>

          <div className="hidden md:flex gap-2">
            <Link to="/auth">
              <Button variant="outline" className="hover-scale">Sign in</Button>
            </Link>
            <Link to="/auth">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-gradient-to-r from-primary to-accent hover:shadow-lg">
                  Get started
                </Button>
              </motion.div>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="md:hidden bg-background border-t border-border/50"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="container py-4 space-y-4">
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="block text-sm text-muted-foreground hover:text-primary"
                >
                  How it works
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="block text-sm text-muted-foreground hover:text-primary"
                >
                  Features
                </button>
                <div className="flex flex-col gap-2 pt-2">
                  <Link to="/auth">
                    <Button variant="outline" className="w-full">Sign in</Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="w-full bg-gradient-to-r from-primary to-accent">
                      Get started
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Dynamic Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-primary/5 to-transparent" />
          
          {/* Floating Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-xl"
              animate={{
                x: [0, 30, -30, 0],
                y: [0, -20, 20, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-accent/10 rounded-full blur-xl"
              animate={{
                x: [0, -40, 40, 0],
                y: [0, 30, -30, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          <div className="container relative z-10 text-center">
            {/* Animation Container */}
            <div className="relative h-32 mb-8">
              <AnimatePresence>
                {showAnimation && (
                  <StickFightAnimation
                    onComplete={handleAnimationComplete}
                    reduceMotion={reduceMotion}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Hero Content */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    <motion.h1
                      className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight max-w-5xl mx-auto"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      Form better habits with friends —{" "}
                      <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        playful, fair, accountable
                      </span>
                    </motion.h1>

                    <motion.p
                      className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                    >
                      Create groups, set challenges, log results, and keep a friendly ledger. 
                      No spreadsheets. Just clarity and momentum.
                    </motion.p>
                  </div>

                  <motion.div
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    <Link to="/auth">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          size="lg" 
                          className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:shadow-xl transition-all duration-300"
                        >
                          Start your first Challenge
                        </Button>
                      </motion.div>
                    </Link>

                    <motion.button
                      onClick={() => scrollToSection('how-it-works')}
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span>Explore Features</span>
                      <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                    </motion.button>
                  </motion.div>

                  {/* Scroll Indicator */}
                  <motion.div
                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1.2 }}
                  >
                    <motion.div
                      animate={{ y: [0, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center"
                    >
                      <motion.div
                        animate={{ y: [0, 12, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-1 h-3 bg-muted-foreground/50 rounded-full mt-2"
                      />
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Storytelling Section */}
        <StorytellingSection />

        {/* Features Section */}
        <FeaturesSection />

        {/* Footer */}
        <footer className="bg-muted/30 py-12">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-muted-foreground mb-4">
                Ready to build better habits with your friends?
              </p>
              <Link to="/auth">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-primary to-accent hover:shadow-xl"
                  >
                    Get Started Today
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default NewIndex;