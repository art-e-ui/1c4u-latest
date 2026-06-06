import React from 'react';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-slate max-w-none">
        <p className="mb-4">Last updated: March 27, 2026</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
        <p className="mb-4">
          Welcome to 1-CartForU. We respect your privacy and are committed to protecting your personal data. 
          This privacy policy will inform you as to how we look after your personal data when you visit our website 
          and tell you about your privacy rights and how the law protects you.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">2. The Data We Collect</h2>
        <p className="mb-4">
          We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Identity Data includes first name, last name, username or similar identifier.</li>
          <li>Contact Data includes billing address, delivery address, email address and telephone numbers.</li>
          <li>Financial Data includes payment card details.</li>
          <li>Transaction Data includes details about payments to and from you and other details of products and services you have purchased from us.</li>
          <li>Technical Data includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">3. How We Use Your Data</h2>
        <p className="mb-4">
          We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
          <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
          <li>Where we need to comply with a legal obligation.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Security</h2>
        <p className="mb-4">
          We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. 
          In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">5. Contact Us</h2>
        <p className="mb-4">
          If you have any questions about this privacy policy or our privacy practices, please contact us at: support@1-cartforu.com
        </p>
      </div>
    </div>
  );
}
