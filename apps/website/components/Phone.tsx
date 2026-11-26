import Image from 'next/image';
import { asset } from '@/lib/site';

type PhoneProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function Phone({ src, alt, className = '', priority }: PhoneProps) {
  return (
    <div className={`rounded-[40px] bg-bezel p-2 shadow-xl ${className}`}>
      <Image
        src={asset(src)}
        alt={alt}
        width={603}
        height={1311}
        priority={priority}
        className="block h-auto w-full rounded-[32px]"
      />
    </div>
  );
}
