"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const HERO_PARTICLES = Array.from({ length: 20 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  duration: Math.random() * 3 + 2,
  delay: Math.random() * 2,
}));

export function HeroLanding() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[#ff78c8]/10 blur-3xl"
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-3/4 right-1/4 h-96 w-96 rounded-full bg-[#ff78c8]/5 blur-3xl"
          animate={{
            y: [0, 20, 0],
            x: [0, -15, 0],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-6"
        >
          <span className="mb-8 inline-block rounded-full border border-black bg-zinc-700/80 px-4 py-2 text-sm font-medium text-white">
            New: Launch Your Startup Today
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="mb-4 flex justify-center"
        >
          <div className="relative h-[200px] w-[600px] max-w-full">
            <Image
              src="/images/startschool-logo.png"
              alt="StartSchool"
              fill
              priority
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="mx-auto mb-8 max-w-4xl text-2xl leading-tight font-bold text-pretty text-white md:text-3xl lg:text-4xl"
        >
          Startup Module Platform
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
          className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-pretty text-white md:text-xl"
        >
          Transform your ideas into reality with our cutting-edge platform. Join
          other StartSchool students and build together!
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button
            size="lg"
            className="group relative overflow-hidden rounded-full bg-[#ff78c8] px-8 py-6 text-lg font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-[#ff60b8] hover:shadow-2xl hover:shadow-[#ff78c8]/25"
            asChild
          >
            <Link href="/login">
              <span className="relative z-10 text-white">
                Login and Create Your Own Startup!
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 space-y-3"
        >
          <p className="text-sm font-bold text-white">Created by</p>
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
            <motion.a
              href="https://linkedin.com/in/eliass-baranovs"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex cursor-pointer items-center gap-2 text-gray-300 transition-colors duration-300 hover:text-[#ff78c8]"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.55 }}
              whileHover={{ opacity: 0.8 }}
            >
              <svg
                className="h-5 w-5 text-blue-500 transition-colors duration-300 group-hover:text-[#ff78c8]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium text-white">Eliass Baranovs</span>
            </motion.a>

            <motion.div
              className="hidden h-1 w-1 rounded-full bg-gray-600 sm:block"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            />

            <motion.a
              href="https://linkedin.com/in/davids-petuhovs"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex cursor-pointer items-center gap-2 text-gray-300 transition-colors duration-300 hover:text-[#ff78c8]"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              whileHover={{ opacity: 0.8 }}
            >
              <svg
                className="h-5 w-5 text-blue-500 transition-colors duration-300 group-hover:text-[#ff78c8]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium text-white">Davids Petuhovs</span>
            </motion.a>
          </div>
        </motion.div>
      </div>

      {isClient && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {HERO_PARTICLES.map((p, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-[#ff78c8]/30"
              style={{ left: p.left, top: p.top }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Number.POSITIVE_INFINITY,
                delay: p.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
