import React from 'react';
import { ShoppingBag, Globe, Users, ShieldCheck } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4 text-foreground">About GlobalCart</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Connecting the world through a premium, secure, and seamless shopping experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
        <div>
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            At GlobalCart Online Shop, our mission is to provide customers worldwide with access to high-quality products from trusted global brands. We believe that shopping should be easy, secure, and accessible to everyone, regardless of where they are located.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We work tirelessly to curate a selection of products that meet our high standards for quality and value, ensuring that every purchase you make with us is one you can trust.
          </p>
        </div>
        <div className="bg-muted rounded-2xl p-8 flex items-center justify-center">
          <ShoppingBag className="h-32 w-32 text-primary opacity-20" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-20">
        <div className="text-center p-6 border border-border rounded-xl">
          <Globe className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="font-bold mb-2">Global Reach</h3>
          <p className="text-sm text-muted-foreground">Shipping to over 100 countries with reliable logistics partners.</p>
        </div>
        <div className="text-center p-6 border border-border rounded-xl">
          <Users className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="font-bold mb-2">Customer First</h3>
          <p className="text-sm text-muted-foreground">Our dedicated support team is available 24/7 to assist you.</p>
        </div>
        <div className="text-center p-6 border border-border rounded-xl">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="font-bold mb-2">Secure Platform</h3>
          <p className="text-sm text-muted-foreground">State-of-the-art security to protect your data and payments.</p>
        </div>
      </div>

      <div className="bg-primary text-primary-foreground rounded-3xl p-10 text-center">
        <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
        <p className="mb-8 opacity-90 max-w-xl mx-auto">
          Experience the future of global e-commerce with GlobalCart. Start shopping today and discover a world of possibilities.
        </p>
        <button className="bg-background text-foreground px-8 py-3 rounded-full font-bold hover:bg-opacity-90 transition-all">
          Start Shopping
        </button>
      </div>
    </div>
  );
}
