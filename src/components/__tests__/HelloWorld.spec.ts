import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HelloWorld from '../HelloWorld.vue'

describe('HelloWorld', () => {
  it('renders properly', () => {
    const wrapper = mount(HelloWorld, { props: { msg: 'Hello Vitest' } })
    expect(wrapper.text()).toContain('Hello Vitest')
  })

  it('renders the message passed as prop', () => {
    const testMessage = 'Test Message'
    const wrapper = mount(HelloWorld, { props: { msg: testMessage } })
    expect(wrapper.find('h1').text()).toBe(testMessage)
  })

  it('contains links to Vue, Vite, and TypeScript', () => {
    const wrapper = mount(HelloWorld, { props: { msg: 'Test' } })
    const links = wrapper.findAll('a')

    expect(links.length).toBe(3)
    expect(links[0].attributes('href')).toBe('https://vitejs.dev/')
    expect(links[1].attributes('href')).toBe('https://vuejs.org/')
    expect(links[2].attributes('href')).toBe('https://www.typescriptlang.org/')
  })
})
