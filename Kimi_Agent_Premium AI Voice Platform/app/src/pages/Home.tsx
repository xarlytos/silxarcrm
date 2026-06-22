import Hero from '../sections/Hero'
import SocialProofBar from '../sections/SocialProofBar'
import Problem from '../sections/Problem'
import Solution from '../sections/Solution'
import Marketplace from '../sections/Marketplace'
import Benefits from '../sections/Benefits'
import ROI from '../sections/ROI'
import FeaturesDeepDive from '../sections/FeaturesDeepDive'
import Comparison from '../sections/Comparison'
import Testimonials from '../sections/Testimonials'
import FAQ from '../sections/FAQ'
import FinalCTA from '../sections/FinalCTA'

export default function Home() {
  return (
    <>
      <Hero />
      <SocialProofBar />
      <Problem />
      <Solution />
      <Testimonials />
      <Marketplace />
      <Benefits />
      <ROI />
      <FeaturesDeepDive />
      <Comparison />
      <FAQ />
      <FinalCTA />
    </>
  )
}
