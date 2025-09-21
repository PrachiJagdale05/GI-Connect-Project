import React from 'react';
import { motion } from 'framer-motion';
import { Award, CheckCircle, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GIBadge from '@/components/GIBadge';

const AboutGI: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <motion.div
        className="container mx-auto px-4 py-24 flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <section className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">About Geographical Indications (GI)</h1>
          <p className="text-lg text-gray-600">
            Learn about the importance and impact of GI tags on products and regions.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-6">What is a Geographical Indication?</h2>
          <p className="text-gray-700 mb-4">
            A Geographical Indication (GI) is a sign used on products that have a specific geographical origin and possess qualities or a reputation that are due to that origin. In order to function as a GI, a sign must identify a product as originating in a given place.
          </p>
          <p className="text-gray-700 mb-4">
            It is a type of intellectual property right that protects the interests of producers and consumers by ensuring the authenticity and quality of products linked to specific regions.
          </p>
          <div className="flex justify-center">
            <Button asChild variant="secondary">
              <Link to="https://www.wipo.int/geo_indications/en/" target="_blank">
                Learn More at WIPO <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-6">Why are GIs Important?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldCheck className="w-5 h-5 mr-2 text-green-500" /> Protection of Authenticity
                </CardTitle>
              </CardHeader>
              <CardContent>
                GIs protect the authenticity of products, ensuring consumers receive genuine items with unique qualities.
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-yellow-500" /> Preservation of Traditional Knowledge
                </CardTitle>
              </CardHeader>
              <CardContent>
                They preserve traditional knowledge and production methods passed down through generations in specific regions.
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-500" /> Economic Development
                </CardTitle>
              </CardHeader>
              <CardContent>
                GIs contribute to the economic development of rural areas by promoting local products and tourism.
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-6">Benefits of GI Certification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">For Producers</h3>
              <ul className="list-disc list-inside text-gray-700">
                <li>Enhanced reputation and brand value</li>
                <li>Access to premium markets and prices</li>
                <li>Legal protection against misuse and imitation</li>
                <li>Collective marketing and promotion opportunities</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">For Consumers</h3>
              <ul className="list-disc list-inside text-gray-700">
                <li>Assurance of product quality and origin</li>
                <li>Access to unique and authentic products</li>
                <li>Support for traditional production methods</li>
                <li>Contribution to rural development</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-6">How to Identify a GI Product</h2>
          <p className="text-gray-700 mb-4">
            GI products often carry a specific logo or label that indicates their certification. Look for these marks when purchasing regional specialties.
          </p>
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-lg">
              <CheckCircle className="w-5 h-5 mr-2" /> GI Certified
            </Badge>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-6">Examples of Famous GI Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Darjeeling Tea</CardTitle>
                <CardDescription>A tea from Darjeeling, India, known for its unique flavor.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  Darjeeling Tea is a GI-protected product, ensuring its authenticity and quality.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link to="https://en.wikipedia.org/wiki/Darjeeling_tea" target="_blank">
                    Learn More <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Champagne</CardTitle>
                <CardDescription>A sparkling wine from the Champagne region of France.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  Champagne is a GI-protected product, ensuring it comes from the Champagne region of France.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link to="https://en.wikipedia.org/wiki/Champagne" target="_blank">
                    Learn More <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Scotch Whisky</CardTitle>
                <CardDescription>A whisky made in Scotland, following specific production methods.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  Scotch Whisky is a GI-protected product, ensuring it is made in Scotland according to traditional methods.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link to="https://en.wikipedia.org/wiki/Scotch_whisky" target="_blank">
                    Learn More <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>What is the difference between a GI and a trademark?</AccordionTrigger>
              <AccordionContent>
                A GI identifies a product as originating from a specific geographical location, while a trademark distinguishes the goods or services of one enterprise from those of other enterprises.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>How does a GI benefit local communities?</AccordionTrigger>
              <AccordionContent>
                GIs promote local products, support traditional production methods, and contribute to the economic development of rural areas.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>How can I report a suspected misuse of a GI?</AccordionTrigger>
              <AccordionContent>
                You can report suspected misuse of a GI to the relevant authorities in the country where the misuse is occurring.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section>
          <h2 className="text-3xl font-semibold mb-6">Explore GI Products</h2>
          <p className="text-gray-700 mb-4">
            Discover and support authentic GI-certified products from various regions.
          </p>
          <div className="flex justify-center">
            <Button asChild>
              <Link to="/marketplace">
                Visit the Marketplace <Sparkles className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>
        <Separator className="my-8" />
        <section>
          <h2 className="text-3xl font-semibold mb-6">Example GI Product Badge</h2>
          <p className="text-gray-700 mb-4">
            This is an example of how a GI product badge might look like.
          </p>
          
          
<GIBadge 
  giTag="Sample GI Product" 
  region="Sample Region"
  className="mb-6"
  productName="Sample Product Name"
  productId="sample-product-id"
/>

        </section>
      </motion.div>
      <Footer />
    </div>
  );
};

export default AboutGI;

const ChevronRight = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);
