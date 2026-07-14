import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import newsletterService from './newsletter.service';

const subscribe = catchAsync(async (req, res) => {
  const result = await newsletterService.subscribe(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.alreadySubscribed
      ? 'You are already subscribed to the newsletter'
      : 'Newsletter subscription successful',
    data: result,
  });
});

const newsletterController = {
  subscribe,
};

export default newsletterController;
