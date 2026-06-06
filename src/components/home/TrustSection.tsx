import React from 'react';
import { ShieldCheck, Truck, Headset, CreditCard } from 'lucide-react';

export function TrustSection() {
  const features = [
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: "Secure Shopping",
      description: "Your data is protected by industry-leading SSL encryption."
    },
    {
      icon: <Truck className="h-8 w-8 text-primary" />,
      title: "Global Shipping",
      description: "Reliable delivery to over 100 countries worldwide."
    },
    {
      icon: <Headset className="h-8 w-8 text-primary" />,
      title: "24/7 Support",
      description: "Dedicated customer service team ready to help anytime."
    },
    {
      icon: <CreditCard className="h-8 w-8 text-primary" />,
      title: "Safe Payments",
      description: "We support all major credit cards and secure gateways."
    }
  ];

  return (
    <section className="py-12 bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center p-4">
              <div className="mb-4 p-3 bg-background rounded-full shadow-sm">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
