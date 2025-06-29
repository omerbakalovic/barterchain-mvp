// app/page.tsx

'use client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";

export default function Landing() {
  // jednostavna varijabla za fade-in animaciju
  const fade = {
    hidden: { opacity: 0, y: 40 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.2 * i },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 font-sans antialiased">
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 pt-24 text-center">
        <motion.h1
          variants={fade}
          initial="hidden"
          animate="show"
          custom={0}
          className="text-5xl md:text-6xl font-extrabold leading-tight mb-6"
        >
          Give what you don’t use →
          <br className="hidden md:block" />
          Get what you truly <span className="text-primary">want</span>
        </motion.h1>
        <motion.p
          variants={fade}
          initial="hidden"
          animate="show"
          custom={1}
          className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10"
        >
          BarterChain AI instantly builds multi-hop swap chains so every item
          finds its next happy owner—no cash, no waste.
        </motion.p>
        <motion.div variants={fade} initial="hidden" animate="show" custom={2}>
          <Button size="lg" className="px-8 py-6 text-xl">
            Join the Beta
          </Button>
        </motion.div>
      </section>

      {/* STATS */}
      <section className="py-16 bg-white shadow-inner">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { label: "Items Re-homed", value: "12,480" },
            { label: "CO₂ Saved (kg)", value: "31,200" },
            { label: "Avg. Match Time", value: "< 24h" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fade}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
              className="text-4xl font-bold text-primary"
            >
              {stat.value}
              <p className="text-base font-medium text-gray-500 mt-2">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <motion.h2
          variants={fade}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          custom={0}
          className="text-3xl md:text-4xl font-bold text-center mb-14"
        >
          How it works
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "List Offer & Want",
              desc:
                "Post the item you’d like to pass on and what you’d love to receive—no need to hunt for a direct match.",
              icon: "📤",
            },
            {
              title: "AI Builds a Chain",
              desc:
                "Our graph algorithm links multiple users into a closed loop where everyone wins.",
              icon: "🔗",
            },
            {
              title: "Ship & Celebrate",
              desc:
                "Print eco-shipping labels, send your item, and track CO₂ savings as your treasure arrives.",
              icon: "🎉",
            },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              variants={fade}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
            >
              <Card className="h-full">
                <CardContent className="p-8 flex flex-col items-center text-center h-full">
                  <span className="text-5xl mb-4">{step.icon}</span>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-white text-center">
        <motion.h2
          variants={fade}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          custom={0}
          className="text-4xl font-bold mb-6"
        >
          Ready to transform clutter into treasure?
        </motion.h2>

        <motion.form
          variants={fade}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          custom={1}
          className="max-w-xl mx-auto flex flex-col md:flex-row gap-4 px-4 md:px-0"
        >
          <div className="relative w-full">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
            <input
              type="email"
              required
              placeholder="Your email for beta access"
              className="w-full bg-white/10 border border-white/20 rounded-2xl backdrop-blur-md px-12 py-4 placeholder-white/60 focus:outline-none"
            />
          </div>
          <Button type="submit" size="lg" className="px-8 py-4">
            Join Now
          </Button>
        </motion.form>
      </section>

      {/* FOOTER */}
      <footer className="py-10 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} BarterChain AI – Made with ♻️ in Germany
      </footer>
    </div>
  );
}
