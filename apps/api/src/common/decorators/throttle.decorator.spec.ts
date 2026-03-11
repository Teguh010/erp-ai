import {
  ThrottleStrict,
  ThrottleStandard,
  ThrottleRelaxed,
  ThrottleAuth,
  ThrottleAI,
  SkipThrottle,
} from './throttle.decorator';

describe('Throttle Decorators', () => {
  describe('ThrottleStrict', () => {
    it('should return a decorator function', () => {
      const decorator = ThrottleStrict();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('ThrottleStandard', () => {
    it('should return a decorator function', () => {
      const decorator = ThrottleStandard();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('ThrottleRelaxed', () => {
    it('should return a decorator function', () => {
      const decorator = ThrottleRelaxed();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('ThrottleAuth', () => {
    it('should return a decorator function', () => {
      const decorator = ThrottleAuth();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('ThrottleAI', () => {
    it('should return a decorator function', () => {
      const decorator = ThrottleAI();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('SkipThrottle', () => {
    it('should be exported from @nestjs/throttler', () => {
      expect(SkipThrottle).toBeDefined();
      expect(typeof SkipThrottle).toBe('function');
    });
  });
});
