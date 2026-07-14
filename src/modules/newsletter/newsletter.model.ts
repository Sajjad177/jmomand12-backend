import { model, Schema } from 'mongoose';
import { INewsletterSubscription } from './newsletter.interface';

const newsletterSchema = new Schema<INewsletterSubscription>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    source: {
      type: String,
      default: 'website-footer',
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const NewsletterSubscription = model<INewsletterSubscription>(
  'NewsletterSubscription',
  newsletterSchema,
);

export default NewsletterSubscription;
