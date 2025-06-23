// File: src/frontend/pages/LandingPage.jsx
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
  Card,
} from '@mui/material';
import {
  Menu,
  X,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: delay => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.8, ease: 'easeOut' }
  }),
};

const LandingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.2]);

  const nav = ['Features', 'Pricing', 'FAQ'];

  const benefits = [
    { icon: <Star size={28} />, label: 'Zero Subscription Costs', desc: 'Pay only when you get paid.' },
    { icon: <Zap size={28} />, label: 'Smart Automation', desc: 'Never chase late invoices again.' },
    { icon: <Clock size={28} />, label: 'Instant Setup', desc: 'Start in under 5 minutes.' },
  ];

  const features = [
    {
      title: 'Automated Follow Ups',
      desc: 'Our intelligent system sends polite, timely reminders to ensure you never chase late invoices again.',
    },
    {
      title: 'Branded Invoices',
      desc: 'Create professional invoices with your logo and colors in seconds.',
    },
    {
      title: 'Seamless Payments',
      desc: 'Accept payments instantly via Stripe with one-click setup.',
    },
    {
      title: 'Real Time Insights',
      desc: 'Track cash flow with a sleek dashboard that updates instantly.',
    },
  ];

  const faqs = [
    {
      q: 'What does Chaseless cost?',
      a: 'Only 1% on top of Stripe’s 2.9% + 30¢ per transaction. No monthly fees, no hidden costs—ever.',
    },
    {
      q: 'How do automated follow ups work?',
      a: 'Our smart system sends customizable reminders at optimal times, ensuring your invoices get paid without awkward emails.',
    },
    {
      q: 'Why is it free to start?',
      a: 'We’re built for freelancers, not corporations. Our 1% fee aligns us with your success.',
    },
  ];

  const scrollTo = id => {
    const el = document.getElementById(id.toLowerCase());
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  return (
    <Box sx={{ overflowX: 'hidden', bgcolor: theme.palette.background.default }}>
      {/* NAVBAR */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.background.default, 0.8),
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Typography
            variant="h5"
            sx={{ flexGrow: 1, fontWeight: 800, letterSpacing: -0.5, color: theme.palette.primary.main }}
          >
            Chaseless
          </Typography>
          {!isMobile ? (
            <Stack direction="row" spacing={3} alignItems="center">
              {nav.map(n => (
                <Button
                  key={n}
                  onClick={() => scrollTo(n)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    color: 'text.secondary',
                    '&:hover': { color: theme.palette.primary.main },
                  }}
                >
                  {n}
                </Button>
              ))}
              <Button
                component={Link}
                to="/signup"
                variant="contained"
                color="primary"
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 4,
                  py: 1,
                  borderRadius: 10,
                  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                Start Free
              </Button>
            </Stack>
          ) : (
            <IconButton onClick={() => setOpen(true)} color="primary">
              <Menu size={28} />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* MOBILE DRAWER */}
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260, p: 2, bgcolor: theme.palette.background.default }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>Menu</Typography>
            <IconButton onClick={() => setOpen(false)}>
              <X size={24} />
            </IconButton>
          </Stack>
          <List>
            {nav.map(n => (
              <ListItem button key={n} onClick={() => scrollTo(n)} sx={{ py: 1.5 }}>
                <ListItemText
                  primary={n}
                  primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }}
                />
              </ListItem>
            ))}
            <ListItem sx={{ mt: 2 }}>
              <Button
                component={Link}
                to="/signup"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ textTransform: 'none', fontWeight: 700, py: 1.5, borderRadius: 10 }}
              >
                Start Free
              </Button>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* HERO */}
      <Box
        component={motion.div}
        style={{ opacity: heroOpacity }}
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)}, ${theme.palette.background.default})`,
            zIndex: 0,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={0.2}>
            <Typography
              variant="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '3.5rem', md: '5.5rem' },
                lineHeight: 1.1,
                letterSpacing: -1,
                color: 'text.primary',
                mb: 3,
              }}
            >
              Never Chase Late Invoices Again
            </Typography>
          </motion.div>
          <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={0.4}>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{
                maxWidth: 800,
                mx: 'auto',
                mb: 5,
                fontWeight: 500,
                fontSize: { xs: '1.2rem', md: '1.5rem' }
              }}
            >
              Chaseless automates your invoicing with smart follow ups, stunning designs, and instant payments—all free, with just 1% plus Stripe fees when you’re paid.
            </Typography>
          </motion.div>
          <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={0.6}>
            <Button
              component={Link}
              to="/signup"
              variant="contained"
              color="primary"
              size="large"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              endIcon={<ArrowRight size={20} />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                px: 6,
                py: 2,
                borderRadius: 20,
                boxShadow: `0 6px 30px ${alpha(theme.palette.primary.main, 0.4)}`,
                fontSize: '1.1rem',
              }}
            >
              Get Started Free
            </Button>
          </motion.div>
        </Container>
      </Box>

      {/* BENEFITS */}
      <Box id="features" sx={{ py: { xs: 10, md: 16 }, bgcolor: alpha(theme.palette.background.paper, 0.98) }}>
        <Container maxWidth="lg">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.2} viewport={{ once: true }}>
            <Typography
              variant="h3"
              fontWeight={800}
              textAlign="center"
              sx={{ mb: 8, fontSize: { xs: '2rem', md: '3rem' } }}
            >
              Engineered for Your Success
            </Typography>
          </motion.div>
          <Grid container spacing={4}>
            {benefits.map((b, i) => (
              <Grid item xs={12} md={4} key={i}>
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  whileInView="visible"
                  custom={0.4 + i * 0.2}
                  viewport={{ once: true }}
                >
                  <Card
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      borderRadius: 4,
                      bgcolor: 'background.default',
                      boxShadow: `0 10px 40px ${alpha(theme.palette.primary.dark, 0.1)}`,
                      transition: 'transform 0.3s',
                      '&:hover': { transform: 'translateY(-5px)' },
                    }}
                  >
                    <Box sx={{ color: theme.palette.primary.main, mb: 2 }}>{b.icon}</Box>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                      {b.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {b.desc}
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* PRICING */}
      <Box id="pricing" sx={{ py: { xs: 10, md: 16 }, bgcolor: alpha(theme.palette.background.paper, 0.98) }}>
        <Container maxWidth="md">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.2} viewport={{ once: true }}>
            <Typography
              variant="h3"
              fontWeight={800}
              textAlign="center"
              sx={{ mb: 4, fontSize: { xs: '2rem', md: '3rem' } }}
            >
              Pay Only for Results
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              textAlign="center"
              sx={{ mb: 8, maxWidth: 600, mx: 'auto' }}
            >
              No subscriptions. Just 1% on top of Stripe’s 2.9% + 30¢ when you get paid. Your success is our success.
            </Typography>
          </motion.div>
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.4} viewport={{ once: true }}>
            <Card
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 4,
                border: `2px solid ${theme.palette.primary.main}`,
                boxShadow: `0 15px 50px ${alpha(theme.palette.primary.main, 0.2)}`,
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: theme.palette.primary.main,
                  color: '#fff',
                  px: 3,
                  py: 1,
                  borderRadius: 20,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                1% + Stripe Fees
              </Box>
              <Typography variant="h2" color="primary" fontWeight={900} sx={{ mt: 4, mb: 2 }}>
                $0/month
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                Only pay 1% plus Stripe’s 2.9% + 30¢ per transaction. No hidden fees, no commitments.
              </Typography>
              <Button
                component={Link}
                to="/signup"
                variant="contained"
                color="primary"
                size="large"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                sx={{ textTransform: 'none', fontWeight: 700, px: 6, py: 2, borderRadius: 20 }}
              >
                Start Free Now
              </Button>
            </Card>
          </motion.div>
        </Container>
      </Box>

      {/* FAQ */}
      <Box id="faq" sx={{ py: { xs: 10, md: 16 }, bgcolor: alpha(theme.palette.background.paper, 0.98) }}>
        <Container maxWidth="md">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.2} viewport={{ once: true }}>
            <Typography
              variant="h3"
              fontWeight={800}
              textAlign="center"
              sx={{ mb: 8, fontSize: { xs: '2rem', md: '3rem' } }}
            >
              Your Questions Answered
            </Typography>
          </motion.div>
          <Grid container spacing={3}>
            {faqs.map((faq, i) => (
              <Grid item xs={12} key={i}>
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  whileInView="visible"
                  custom={0.4 + i * 0.2}
                  viewport={{ once: true }}
                >
                  <Card
                    sx={{
                      p: 4,
                      borderRadius: 4,
                      bgcolor: 'background.default',
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.dark, 0.1)}`,
                    }}
                  >
                    <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
                      {faq.q}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {faq.a}
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FINAL CTA */}
      <Box
        sx={{
          py: { xs: 12, md: 20 },
          textAlign: 'center',
          bgcolor: theme.palette.primary.main,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          '&:after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `linear-gradient(180deg, ${alpha(theme.palette.primary.dark, 0.4)}, transparent)`,
            zIndex: 0,
          },
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.2} viewport={{ once: true }}>
            <Typography
              variant="h2"
              fontWeight={900}
              sx={{ mb: 4, fontSize: { xs: '2.5rem', md: '4rem' }, lineHeight: 1.2 }}
            >
              Redefine Invoicing Now
            </Typography>
            <Typography
              variant="h5"
              sx={{ mb: 6, maxWidth: 600, mx: 'auto', fontWeight: 500 }}
            >
              Join 15,000 freelancers who never chase payments again. Start free, pay only 1% plus Stripe fees when you succeed.
            </Typography>
          </motion.div>
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.4} viewport={{ once: true }}>
            <Button
              component={Link}
              to="/signup"
              variant="contained"
              size="large"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                px: 8,
                py: 2.5,
                bgcolor: '#fff',
                color: theme.palette.primary.main,
                borderRadius: 20,
                boxShadow: `0 10px 40px ${alpha('#fff', 0.3)}`,
                fontSize: '1.2rem',
                '&:hover': { bgcolor: alpha('#fff', 0.9) },
              }}
            >
              Start Free Today
            </Button>
          </motion.div>
          <Typography variant="caption" sx={{ mt: 3, opacity: 0.7, fontSize: '0.9rem' }}>
            No credit card needed. Setup in 5 minutes.
          </Typography>
        </Container>
      </Box>

      {/* BENEFITS */}
      <Box sx={{ py: { xs: 10, md: 16 }, bgcolor: alpha(theme.palette.background.paper, 0.98) }}>
        <Container maxWidth="lg">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.2} viewport={{ once: true }}>
            <Typography
              variant="h3"
              fontWeight={800}
              textAlign="center"
              sx={{ mb: 8, fontSize: { xs: '2rem', md: '3rem' } }}
            >
              Engineered for Your Success
            </Typography>
          </motion.div>
          <Grid container spacing={4}>
            {benefits.map((b, i) => (
              <Grid item xs={12} md={4} key={i}>
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  whileInView="visible"
                  custom={0.4 + i * 0.2}
                  viewport={{ once: true }}
                >
                  <Card
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      borderRadius: 4,
                      bgcolor: 'background.default',
                      boxShadow: `0 10px 40px ${alpha(theme.palette.primary.dark, 0.1)}`,
                      transition: 'transform 0.3s',
                      '&:hover': { transform: 'translateY(-5px)' },
                    }}
                  >
                    <Box sx={{ color: theme.palette.primary.main, mb: 2 }}>{b.icon}</Box>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                      {b.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {b.desc}
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FEATURES */}
      <Box id="features" sx={{ py: { xs: 10, md: 16 }, bgcolor: '#fff' }}>
        <Container maxWidth="lg">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.2} viewport={{ once: true }}>
            <Typography
              variant="h3"
              fontWeight={800}
              textAlign="center"
              sx={{ mb: 8, fontSize: { xs: '2rem', md: '3rem' } }}
            >
              Built to Simplify Your Hustle
            </Typography>
          </motion.div>
          <Grid container spacing={4}>
            {features.map((f, i) => (
              <Grid item xs={12} md={6} key={i}>
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  whileInView="visible"
                  custom={0.4 + i * 0.2}
                  viewport={{ once: true }}
                >
                  <Stack direction="row" spacing={3} alignItems="flex-start">
                    <Box
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        borderRadius: '50%',
                        p: 2,
                        minWidth: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircle size={24} color={theme.palette.primary.main} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                        {f.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {f.desc}
                      </Typography>
                    </Box>
                  </Stack>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* PRICING */}
      <Box id="pricing" sx={{ py: { xs: 10, md: 16 }, bgcolor: alpha(theme.palette.background.paper, 0.98) }}>
        <Container maxWidth="md">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.2} viewport={{ once: true }}>
            <Typography
              variant="h3"
              fontWeight={800}
              textAlign="center"
              sx={{ mb: 4, fontSize: { xs: '2rem', md: '3rem' } }}
            >
              Pay Only for Results
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              textAlign="center"
              sx={{ mb: 8, maxWidth: 600, mx: 'auto' }}
            >
              No subscriptions. Just 1% on top of Stripe’s 2.9% + 30¢ when you get paid. Your success is our success.
            </Typography>
          </motion.div>
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.4} viewport={{ once:Boolean }}>
            <Card
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 4,
                border: `2px solid ${theme.palette.primary.main}`,
                boxShadow: `0 15px 50px ${alpha(theme.palette.primary.main, 0.2)}`,
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: theme.palette.primary.main,
                  color:'#fff',
                  px: 3, py: 1,
                  borderRadius:20,
                  fontWeight:700,
                  fontSize:'0.9rem'
                }}
              >
                1% + Stripe Fees
              </Box>
              <Typography variant="h2" color="primary" fontWeight={900} sx={{ mt: 4, mb: 2 }}>
                $0/month
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth:400, mx:'auto' }}>
                Only pay 1% plus Stripe’s 2.9% + 30¢ per transaction. No hidden fees, no commitments.
              </Typography>
              <Button
                component={Link}
                to="/signup"
                variant="contained"
                color="primary"
                size="large"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                sx={{ textTransform:'none', fontWeight:700, px:6, py:2, borderRadius:20 }}
              >
                Start Free Now
              </Button>
            </Card>
          </motion.div>
        </Container>
      </Box>

      {/* FAQ */}
      <Box id="faq" sx={{ py:{ xs:10, md:16 }, bgcolor:alpha(theme.palette.background.paper,0.98) }}>
        <Container maxWidth="md">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.2} viewport={{ once:true }}>
            <Typography
              variant="h3"
              fontWeight={800}
              textAlign="center"
              sx={{ mb:8, fontSize:{ xs:'2rem', md:'3rem' } }}
            >
              Your Questions Answered
            </Typography>
          </motion.div>
          <Grid container spacing={3}>
            {faqs.map((faq, i) => (
              <Grid item xs={12} key={i}>
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  whileInView="visible"
                  custom={0.4 + i*0.2}
                  viewport={{ once:true }}
                >
                  <Card
                    sx={{
                      p:4,
                      borderRadius:4,
                      bgcolor:'background.default',
                      boxShadow:`0 4px 20px ${alpha(theme.palette.primary.dark,0.1)}`
                    }}
                  >
                    <Typography variant="h5" fontWeight={600} sx={{ mb:2 }}>
                      {faq.q}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {faq.a}
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FINAL CTA */}
      <Box
        sx={{
          py:{ xs:12, md:20 },
          textAlign:'center',
          bgcolor:theme.palette.primary.main,
          color:'#fff',
          position:'relative',
          overflow:'hidden',
          '&:after': {
            content:'""',
            position:'absolute',
            top:0,left:0,width:'100%',height:'100%',
            background:`linear-gradient(180deg, ${alpha(theme.palette.primary.dark,0.4)}, transparent)`,
            zIndex:0
          }
        }}
      >
        <Container maxWidth="md" sx={{ position:'relative', zIndex:1 }}>
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.2} viewport={{ once:true }}>
            <Typography
              variant="h2"
              fontWeight={900}
              sx={{ mb:4, fontSize:{ xs:'2.5rem', md:'4rem' }, lineHeight:1.2 }}
            >
              Redefine Invoicing Now
            </Typography>
            <Typography
              variant="h5"
              sx={{ mb:6, maxWidth:600, mx:'auto', fontWeight:500 }}
            >
              Join 15,000 freelancers who never chase payments again. Start free, pay only 1% plus Stripe fees when you succeed.
            </Typography>
          </motion.div>
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" custom={0.4} viewport={{ once:true }}>
            <Button
              component={Link}
              to="/signup"
              variant="contained"
              size="large"
              whileHover={{ scale:1.1 }}
              whileTap={{ scale:0.95 }}
              sx={{
                textTransform:'none',
                fontWeight:700,
                px:8,
                py:2.5,
                bgcolor:'#fff',
                color:theme.palette.primary.main,
                borderRadius:20,
                boxShadow:`0 10px 40px ${alpha('#fff',0.3)}`,
                fontSize:'1.2rem',
                '&:hover':{ bgcolor:alpha('#fff',0.9) }
              }}
            >
              Start Free Today
            </Button>
          </motion.div>
          <Typography variant="caption" sx={{ mt:3, opacity:0.7, fontSize:'0.9rem' }}>
            No credit card needed. Setup in 5 minutes.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
