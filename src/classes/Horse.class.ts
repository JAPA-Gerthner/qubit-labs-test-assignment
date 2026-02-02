import { faker } from '@faker-js/faker';
import { Mock, EnableMocks } from '@/utilities/decorators/Mock.decorator';

@EnableMocks
export class Horse {
  @Mock(() => faker.person.firstName())
  name!: string;

  @Mock(() => faker.number.int({ min: 1, max: 100 }))
  condition!: number;

  @Mock(() => faker.color.rgb())
  color!: string;
}
