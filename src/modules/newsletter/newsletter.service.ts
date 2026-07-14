import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import NewsletterSubscription from './newsletter.model';
import { INewsletterSubscription } from './newsletter.interface';

const subscribe = async (payload: INewsletterSubscription) => {
  const email = payload.email?.trim().toLowerCase();

  if (!email) {
    throw new AppError('Email is required', StatusCodes.BAD_REQUEST);
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    throw new AppError('Please provide a valid email address', StatusCodes.BAD_REQUEST);
  }

  const existing = await NewsletterSubscription.findOne({ email });
  if (existing) {
    return {
      email: existing.email,
      source: existing.source,
      alreadySubscribed: true,
    };
  }

  const created = await NewsletterSubscription.create({
    email,
    source: payload.source?.trim() || 'website-footer',
  });

  return {
    email: created.email,
    source: created.source,
    alreadySubscribed: false,
  };
};

const newsletterService = {
  subscribe,
};

export default newsletterService;
